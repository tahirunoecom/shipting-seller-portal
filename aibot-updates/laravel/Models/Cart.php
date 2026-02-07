<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use DB;
use App\Http\Controllers\ScanSellc;
use App\Models\Driver;
use Illuminate\Support\Facades\Log;

class Cart extends Model
{
	public $db;
	function getCountryStateCity($where)
	{
		if (count($where)) {
			$this->db = DB::table('wh_zipcode AS z');
			$this->db->select([
				"z.zip",
				"z.city as city",
				"s.name as state_name",
				"s.state_id as state_id",
				"s.code as state_code",
				"c.name as country_name",
				"c.iso_code_2 as country_code",
				"c.country_id as country_id"
			]);
			$this->db->join('wh_state AS s', 's.code', '=', 'z.state_id');
			$this->db->join('wh_country AS c', 'c.country_id', '=', 's.country_id');
			$this->db->where($where);
			$response_data = $this->db->get()->first();
			return $response_data;
		}
		return false;
	}


	function addProductToCart($data)
	{
		$this->db = DB::table('ai_cart');
		$this->db->select(["cart_id", "shipper_id"]);
		$this->db->where(['user_id' => $data['user_id']]);
		$result = $this->db->get()->first();
		if (!$result) {
			DB::table('ai_cart')
				->insert(['user_id' => $data['user_id'], 'shipper_id' => $data['shipper_id']]);
			$cart_id = DB::getPdo()->lastInsertId();
			$old_shipper_id = $data['shipper_id'];
		} else {
			$cart_id = $result->cart_id;
			$old_shipper_id = $result->shipper_id;
		}
		if ($data['shipper_id'] == $old_shipper_id) {
			$this->db = DB::table('ai_cart_details');
			$this->db->select(["product_id", "quantity"]);
			$this->db->where(['product_id' => $data['product_id'], 'cart_id' => $cart_id]);
			$result = $this->db->get()->first();
			if ($result) {
				$product_id = $result->product_id;
				$quantity = $result->quantity;
				$quantity = $result->quantity;
			} else {
				$quantity = 0;
				$product_id = 0;
			}
			$quantity = 0;
			$this->db = DB::table('ai_product as p');
			$this->db->select(["p.ai_product_id", DB::raw("(wp.quantity-ifnull(wp.ordered_qty,0)) as total_product_quantity")]);
			$this->db->join('wh_producttoshipper as wp', 'wp.ai_product_id', '=', 'p.ai_product_id');
			$this->db->where(['wp.id' => $data['product_id']]);
			$result = $this->db->get()->first();
			if (!$result) {
				// echo "else";
				$this->db = DB::table('oc_product as p');
				$this->db->select(["p.product_id as ai_product_id", DB::raw("(wp.quantity-ifnull(wp.ordered_qty,0)) as total_product_quantity")]);
				$this->db->join('wh_producttoshipper as wp', 'wp.ai_product_id', '=', 'p.product_id');
				$this->db->where(['wp.id' => $data['product_id']]);
				$this->db->where(['wp.product_type' => 'ECOM']);
				$result = $this->db->get()->first();
			}
			if ($result) {
				$product_quantity = $result->total_product_quantity;
				$total_quantity = $quantity + $data['quantity'];
				if ($total_quantity <= $product_quantity) {
					if (!$product_id) {
						DB::table('ai_cart_details')
							->insert(['product_id' => $data['product_id'], 'quantity' => $total_quantity, 'cart_id' => $cart_id]);
						$cart_detail_id = DB::getPdo()->lastInsertId();
						return ['status' => 1, 'data' => (object)['cart_detail_id' => $cart_detail_id, 'product_id' => $data['product_id'], 'cart_id' => $cart_id, 'quantity' => $total_quantity], 'code' => 200, 'case' => 1, 'message' => 'Product successfully added to the cart'];
					} else {
						$this->db = DB::table('ai_cart_details');
						$this->db->where(array('product_id' => $data['product_id'], 'cart_id' => $cart_id));
						$this->db->update(['product_id' => $data['product_id'], 'quantity' => $total_quantity, 'cart_id' => $cart_id]);
						$latest_updated_data = DB::table('ai_cart_details as cd')
							->select(["cd.id as cart_detail_id", "cd.cart_id", "cd.quantity", "cd.product_id"])
							->where(['cd.cart_id' => $cart_id, 'cd.product_id' => $product_id])
							->get()->first();
						return ['status' => 1, 'data' => $latest_updated_data, 'code' => 200, 'case' => 1, 'message' => 'Product Quantity has been updated successfully!'];
					}
				} else {
					return ['status' => 0, 'code' => 402, 'data' => (object)['old_quantity' => $product_quantity], 'case' => 2, 'message' => "That's all we have in stock at the moment!"];
				}
			} else {
				return ['status' => 0, 'code' => 402, 'data' => (object)['old_quantity' => $data['quantity']], 'case' => 2, 'message' => 'Something went wrong. Please try again later!'];
			}
		} else {
			return ['status' => 0, 'code' => 402, 'data' => (object)['old_quantity' => $data['quantity']], 'case' => 3, 'message' => 'You added a product from another seller (Clear existing cart)?'];
		}
	}


	function checkProductQuantityInStock($data)
	{
		$this->db = DB::table('ai_cart');
		$this->db->select(["cart_id", "shipper_id"]);
		$this->db->where(['user_id' => $data['user_id']]);
		$result = $this->db->get()->first();
		if ($result) {
			$this->db = DB::table('ai_cart_details');
			$this->db->select(["id", "product_id", "quantity"]);
			$this->db->where(['cart_id' => $result->cart_id]);
			$cart_detail = $this->db->get()->first();
			if (count($cart_detail)) {
				foreach ($cart_detail as $cart) {
					$id = $cart->id;
					$product_id = $cart->product_id;
					$quantity = $cart->quantity;
					$this->db = DB::table('ai_product as p');
					$this->db->select(["p.ai_product_id", DB::raw("(wp.quantity-ifnull(wp.ordered_qty,0)) as total_product_quantity")]);
					$this->db->join('wh_producttoshipper as wp', 'wp.ai_product_id', '=', 'p.ai_product_id');
					$this->db->where(['wp.id' => $product_id]);
					$product_result = $this->db->get()->first();
					if (!$product_result) {
						// echo "else";
						$this->db = DB::table('oc_product as p');
						$this->db->select(["p.product_id as ai_product_id", DB::raw("(wp.quantity-ifnull(wp.ordered_qty,0)) as total_product_quantity")]);
						$this->db->join('wh_producttoshipper as wp', 'wp.ai_product_id', '=', 'p.product_id');
						$this->db->where(['wp.product_type' => 'ECOM']);
						$this->db->where(['wp.id' => $data['product_id']]);
						$product_result = $this->db->get()->first();
					}
					if ($quantity > $product_result->total_product_quantity) {
						$this->removeProductFromCart(['id' => $id, 'user_id' => $data['user_id']]);
					}
				}
			}
		}
	}
	function getCategories($where)
	{
		$this->db = DB::table('ai_category as c');
		$this->db->select(
			[
				"c.id",
				"c.name",
				"c.image",
				"c.status"
			]
		);
		if (count($where) > 0) {
			$this->db->where($where);
		}
		$this->db->orderBy("c.code", "ASC");
		$result = $this->db->get();
		return $result;
	}


	function cartList_old_monu($where)
	{
		if (count($where) > 0) {

			$this->db = DB::table('ai_cart_details as cd');
			$this->db->select(
				[
					"c.cart_id",
					"cd.id",
					"cd.product_id",
					"cd.quantity",
					"wp.title",
					"wp.upc",
					"wp.price",
					"wp.image",
					"wp.wh_account_id as shipper_id",
					"wp.seller_id as ecomseller_id",
					"wp.discount",
					"wp.product_type",
					"wp.ai_category_id",
					DB::raw("round((wp.price) - ( (wp.discount/100) * (wp.price) ),2 ) as discounted_price"),
					"p.weight"
				]
			);
			$this->db->join('wh_producttoshipper as wp', 'wp.id', '=', 'cd.product_id');
			$this->db->join('ai_product as p', 'p.ai_product_id', '=', 'wp.ai_product_id');
			$this->db->join('ai_cart as c', 'c.cart_id', '=', 'cd.cart_id');
			$this->db->where($where);
			$result = $this->db->get();


			if (!isset($result) || count($result) === 0) {
				$this->db = DB::table('ai_cart_details as cd');
				$this->db->select(
					[
						"c.cart_id",
						"cd.id",
						"cd.product_id",
						"cd.quantity",
						"wp.title",
						"wp.upc",
						"wp.price",
						"wp.image",
						"wp.wh_account_id as shipper_id",
						"wp.seller_id as ecomseller_id",
						"wp.discount",
						"wp.product_type",
						DB::raw("round((wp.price) - ( (wp.discount/100) * (wp.price) ),2 ) as discounted_price"),
						// "p.weight"
					]
				);
				$this->db->join('wh_producttoshipper as wp', 'wp.id', '=', 'cd.product_id');
				$this->db->join('oc_product as p', 'p.product_id', '=', 'wp.ai_product_id');
				$this->db->join('ai_cart as c', 'c.cart_id', '=', 'cd.cart_id');
				$this->db->where(['wp.product_type' => 'ECOM']);
				$this->db->where($where);
				$result = $this->db->get();
				// echo '<pre>';
				// print_r($result); die;
			}
			return $result;
		}
	}

	function cartList($where)
	{
		if (count($where) > 0) {
			$this->db = DB::table('ai_cart_details as cd');
			$this->db->select(
				[
					"c.cart_id",
					"cd.id",
					"cd.product_id",
					"cd.quantity",
					"wp.title",
					"wp.upc",
					"wp.price",
					"wp.image",
					"wp.wh_account_id as shipper_id",
					"wp.seller_id as ecomseller_id",
					"wp.discount",
					"wp.product_type",
					"wp.ai_category_id",
					"wp.description",
					DB::raw("round((wp.price) - ( (wp.discount/100) * (wp.price) ),2 ) as discounted_price"),
				]
			);
			$this->db->join('wh_producttoshipper as wp', 'wp.id', '=', 'cd.product_id');
			//$this->db->join('ai_product as p', 'p.ai_product_id','=','wp.ai_product_id');
			$this->db->join('ai_cart as c', 'c.cart_id', '=', 'cd.cart_id');
			$this->db->where($where);
			$result = $this->db->get();
			return $result;
		}
	}

	function totalCartItem_monu($user_id)
	{
		if ($user_id) {
			$this->db = DB::table('ai_cart_details as cd');
			$this->db->select(
				[
					"c.cart_id",
					"cd.id",
				]
			);
			$this->db->join('wh_producttoshipper as wp', 'wp.id', '=', 'cd.product_id');
			$this->db->join('ai_product as p', 'p.ai_product_id', '=', 'wp.ai_product_id');
			$this->db->join('ai_cart as c', 'c.cart_id', '=', 'cd.cart_id');
			$this->db->where(['c.user_id' => $user_id]);
			$result = $this->db->get();
			if (!isset($result) || count($result) === 0) {
				$this->db = DB::table('ai_cart_details as cd');
				$this->db->select(
					[
						"c.cart_id",
						"cd.id",
					]
				);
				$this->db->join('wh_producttoshipper as wp', 'wp.id', '=', 'cd.product_id');
				$this->db->join('oc_product as p', 'p.product_id', '=', 'wp.ai_product_id');
				$this->db->join('ai_cart as c', 'c.cart_id', '=', 'cd.cart_id');
				$this->db->where(['wp.product_type' => 'ECOM']);
				$this->db->where(['c.user_id' => $user_id]);
				$result = $this->db->get();
			}
			return count($result);



			/*
            $this->db = DB::table('ai_cart AS c');
            $this->db->select([
                DB::raw("count(cd.id) as total_cart"),
            ]);
            $this->db->join('ai_cart_details as cd', 'cd.cart_id', '=', 'c.cart_id');
            $this->db->where(['c.user_id'=>$user_id]);
            $result=$this->db->get()->first();
            return $result->total_cart;
			*/
		}
		return false;
	}

	function totalCartItem($user_id)
	{
		if ($user_id) {
			$this->db = DB::table('ai_cart_details as cd');
			$this->db->select(
				[
					"c.cart_id",
					"cd.id",
				]
			);
			$this->db->join('wh_producttoshipper as wp', 'wp.id', '=', 'cd.product_id');
			//$this->db->join('ai_product as p', 'p.ai_product_id','=','wp.ai_product_id');
			$this->db->join('ai_cart as c', 'c.cart_id', '=', 'cd.cart_id');
			$this->db->where(['c.user_id' => $user_id]);
			$result = $this->db->get();
			return count($result);
		}
		return false;
	}

	function removeProductFromCart($data)
	{
		$this->db = DB::table('ai_cart_details');
		$this->db->select(["cart_id"]);
		$this->db->where(['id' => $data['id']]);
		$result = $this->db->get()->first();
		if ($result) {
			$cart_id = $result->cart_id;
			if ($cart_id) {
				DB::table('ai_cart_details')->where(['id' => $data['id']])->delete();
				$total_product = $this->totalCartItem($data['user_id']);
				if (!$total_product) {
					DB::table('ai_cart')->where(['cart_id' => $cart_id])->delete();
				}
				return $result;
			}
		}
	}

	function mergeCart($cooke, $user_id)
	{
		$this->db = DB::table('ai_cart');
		$this->db->select(["cart_id", "user_id"]);
		$this->db->where(['user_id' => $user_id]);
		$result = $this->db->get()->first();
		if (!$result) {
			$this->db = DB::table('ai_cart');
			$this->db->where(array('user_id' => $cooke));
			$this->db->update(['user_id' => $user_id]);
		} else {
			$cart_id = $result->cart_id;
			$user_id = $result->user_id;
			$this->db = DB::table('ai_cart AS c');
			$this->db->select([
				"c.cart_id",
				"c.user_id",
				"cd.id",
				"cd.product_id",
				"cd.quantity"
			]);
			$this->db->join('ai_cart_details as cd', 'cd.cart_id', '=', 'c.cart_id');
			$this->db->where(['c.user_id' => $cooke]);
			$cart_details_data = $this->db->get();
			if (count($cart_details_data) > 0) {
				foreach ($cart_details_data as $cart_details_row) {
					$new_cart_id = $cart_details_row->cart_id;
					$product_id = $cart_details_row->product_id;
					$id = $cart_details_row->id;

					$this->db = DB::table('ai_cart_details');
					$this->db->select(["cart_id", "id"]);
					$this->db->where(['cart_id' => $cart_id, 'product_id' => $product_id]);
					$result = $this->db->get()->first();
					if ($result) {
						DB::table('ai_cart_details')->where(['id' => $id])->delete();
					} else {
						$this->db = DB::table('ai_cart_details');
						$this->db->where(array('cart_id' => $new_cart_id));
						$this->db->update(['cart_id' => $cart_id]);
					}
				}
				DB::table('ai_cart')->where(['cart_id' => $new_cart_id])->delete();
				return true;
			}
			return true;
		}
		return true;
	}

	function checkShipperOldNew($session_id, $user_id)
	{
		if (!empty($session_id) && !empty($user_id)) {
			$this->db = DB::table('ai_cart');
			$this->db->select(["cart_id", "user_id", "shipper_id"]);
			$this->db->where(['user_id' => $user_id]);
			$result = $this->db->get()->first();
			if ($result) {
				$shipper_id = $result->shipper_id;
				if ($shipper_id) {
					$this->db = DB::table('ai_cart');
					$this->db->select(["cart_id", "user_id", "shipper_id"]);
					$this->db->where(['user_id' => $session_id]);
					$session_result = $this->db->get()->first();
					if ($session_result) {
						$session_shipper_id = $session_result->shipper_id;
						if ($session_shipper_id != $shipper_id) {
							return ['status' => 1, 'case' => 1, 'code' => 402, 'data' => (object)[], 'message' => 'Do you want to replace products from your existing cart?'];
						}
					}
					return ['status' => 0, 'case' => 2, 'code' => 402, 'data' => (object)[], 'message' => 'Same Shipper'];
				}
				return ['status' => 0, 'case' => 3, 'code' => 402, 'data' => (object)[], 'message' => 'Same Shipper'];
			}
			return ['status' => 0, 'case' => 4, 'code' => 402, 'data' => (object)[], 'message' => 'Same Shipper'];
		}
		return ['status' => 0, 'case' => 5, 'code' => 402, 'data' => (object)[], 'message' => 'Same Shipper'];
	}
	function destroyCart($user_id)
	{
		$this->db = DB::table('ai_cart');
		$this->db->select(["cart_id", "user_id"]);
		$this->db->where(['user_id' => $user_id]);
		$result = $this->db->get()->first();
		if ($result) {
			$cart_id = $result->cart_id;
			DB::table('ai_cart_details')->where(['cart_id' => $cart_id])->delete();
			DB::table('ai_cart')->where(['cart_id' => $cart_id])->delete();
			return ['status' => 1, 'code' => 200, 'data' => (object)[], 'message' => 'Cart successfully destroyed'];
		}
		return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'Cart not found'];
	}


	function createOrder($order_data)
	{
		if (count($order_data)) {
			//DB::enableQueryLog(); 
			$this->db = DB::table('ai_cart_details as cd');
			$this->db->select(
				[
					"c.cart_id",
					"c.shipper_id",
					"cd.id",
					"cd.product_id",
					"wp.ai_product_id",
					"wp.seller_id as ecomseller_id",
					"cd.quantity",
					"wp.title",
					"wp.price",
					"wp.image",
					"wp.discount",
					"wp.product_type",
					DB::raw("round((wp.price) - ( (wp.discount/100) * (wp.price) ),2 ) as discounted_price"),
				]
			);
			$this->db->join('wh_producttoshipper as wp', 'wp.id', '=', 'cd.product_id');
			//$this->db->join('ai_product as p', 'p.ai_product_id','=','wp.ai_product_id');
			$this->db->join('ai_cart as c', 'c.cart_id', '=', 'cd.cart_id');
			//$this->db->where(['wp.product_type'=>'AI']);
			$this->db->where(['c.user_id' => $order_data['user_id']]);
			$result = $this->db->get();
			// echo "out";
			/*
			if(!isset($result) || count($result) === 0){
				// echo "else";
				$this->db = DB::table('ai_cart_details as cd');
			$this->db->select(
				[
				"c.cart_id",
				"c.shipper_id",
				"cd.id",
				"cd.product_id",
				"wp.ai_product_id",
				"wp.seller_id as ecomseller_id",
				"cd.quantity",
				"wp.title",
				"wp.price",
				"wp.image",
				"wp.discount",
				"wp.product_type",
				DB::raw("round((wp.price) - ( (wp.discount/100) * (wp.price) ),2 ) as discounted_price"),
				]
			);
			$this->db->join('wh_producttoshipper as wp', 'wp.id','=','cd.product_id'); 
			$this->db->join('oc_product as p', 'p.product_id','=','wp.ai_product_id');
 			$this->db->join('ai_cart as c', 'c.cart_id','=','cd.cart_id');
			$this->db->where(['wp.product_type'=>'ECOM']);
			$this->db->where(['c.user_id'=>$order_data['user_id']]);
 			$result = $this->db->get();
			}
			*/


			if (count($result)) {

				$data = $this->getCountryStateCity(['z.zip' => $order_data['zip_code'], 's.country_id' => 223]);
				if ($data) {
					$order_data['state_id'] = $data->state_id;
				} else {
					$order_data['state_id'] = 0;
				}
				$order_data['country_id'] = 223;
				// echo '<pre>';
				// print_r($result);
				// die;
				// echo "sdfsd";

				if ($result[0]->product_type == "AI") {
					$product_type = 4;   //scansell without carrier
				} else {
					$product_type = 1;  //ecom with carrier
				}

				DB::table('wh_shipper_order')
					->insert(
						[
							'invoice_no' => $order_data['invoice_no'],
							'pp_invoice_id' => $order_data['pp_invoice_id'],
							'pp_billing_email' => $order_data['pp_billing_email'],
							'customer_id' => $order_data['user_id'],
							'ecom_seller_id' => $result[0]->ecomseller_id ? $result[0]->ecomseller_id : 0,
							'customer_address_id' => $order_data['customer_address_id'],
							'order_reference' => $order_data['order_reference'] ? $order_data['order_reference'] : 'ANYTHINGINSTANTLYAPP',
							'pos_order_status' => $order_data['pos_order_status'] ? $order_data['pos_order_status'] : 'Pending',

							'name' => $order_data['name'],
							'phone' => $order_data['phone'],
							'email' => $order_data['email'] ? $order_data['email'] : '',
							'address' => $order_data['address'],
							'address_name' => $order_data['address_name'],
							'city' => $order_data['city'],
							'state_id' => $order_data['state_id'],
							'state' => $order_data['state'],
							'country_id' => $order_data['country_id'],
							'country' => $order_data['country'],
							'zip_code' => $order_data['zip_code'],
							'total_product' => count($result),
							'total_product_quantity' => 0,
							'order_amount' => $order_data['total_payable_amount'],
							'commission' => 0,
							'tax' => 0,
							'total_amount' => $order_data['total_payable_amount'],
							'order_status_id' => 1,
							'payment_status' => $order_data['payment_status'],
							'payment_method' => $order_data['payment_method'],
							'payment_id' => $order_data['payment_id'],
							'order_date' => now(),
							'coupon_id' => $order_data['coupon_id'],
							'booking_id' => $order_data['booking_id'],
							'order_type' => $product_type,
							'discounted_amount_after_coupon' => $order_data['discounted_amount_after_coupon'],
						]
					);


				$order_id = DB::getPdo()->lastInsertId();
				$order_data['new_order_id'] = $order_id;

				$total_product_quantity = 0;
				foreach ($result as $row) {
					$getProductPrice = $this->getProductPrice($row->price, $row->discount);
					$product_price = $getProductPrice['product_price'];
					$discounted_price = $getProductPrice['discounted_price'];
					$shipper_id = $row->shipper_id;
					$total_product_quantity += $row->quantity;
					DB::table('wh_shipper_order_product')
						->insert(
							[
								'order_id' => $order_id,
								'product_id' => $row->product_id,
								'ai_product_id' => $row->ai_product_id,
								'title' => $row->title,
								'image' => $row->image,
								'quantity' => $row->quantity,
								'price' => $product_price,
								'total_price' => ($product_price) * ($row->quantity),
								'discounted_price' => $discounted_price,
								'total_discounted_price' => ($discounted_price) * ($row->quantity),
								'product_discount' => $row->discount,
								'added_date' => now(),
							]
						);

					//update qty in product
					$this->db = DB::table('wh_producttoshipper');
					$this->db->where(array('id' => $row->product_id));
					//$this->db->update(array('ordered_qty'=>ordered_qty + $row->quantity));
					$this->db->update(array('ordered_qty' => DB::raw('ordered_qty + ' . $row->quantity . ''), 'total_ordered_qty' => DB::raw('total_ordered_qty + ' . $row->quantity . '')));
				}

				if (isset($order_data['orderMetaData'])) {
					$meta_data_response = $order_data['orderMetaData'];

					if (isset($meta_data_response['seller_payout'])) {
						$shipper_payout = $meta_data_response['seller_payout'];
					} else {
						$shipper_payout = 0.00;
					}
					#####################
					if (isset($meta_data_response['total_delivery_charge'])) {
						$delivery_fee = $meta_data_response['total_delivery_charge'];
					} else {
						$delivery_fee = 0.00;
					}
					if (isset($meta_data_response['Driver_Payout'])) {
						$Driver_Payout = $meta_data_response['Driver_Payout'];
					} else {
						$Driver_Payout = 0.00;
					}
					#####################
				} else {
					$shipper_payout = 0.00;
					$delivery_fee = 0.00;
					$Driver_Payout = 0.00;
				}
				$update_order_data = array(
					'total_product_quantity' => $total_product_quantity,
					'shipper_id' => $shipper_id,
					'shipper_payout' => $shipper_payout,
					'delivery_fee' => $delivery_fee,
					'Driver_Payout' => $Driver_Payout
				);

				$shipper_details = $this->shipperDetails(['u.wh_account_id' => $shipper_id]);

				if ($shipper_details) {
					$update_order_data['shipper_name'] = $shipper_details->firstname . ' ' . $shipper_details->lastname;
					$update_order_data['shipper_phone'] = $shipper_details->telephone;
					$update_order_data['shipper_email'] = $shipper_details->email;
					$update_order_data['shipper_company_name'] = $shipper_details->company;
					$update_order_data['shipper_address'] = $shipper_details->address_1;
					$update_order_data['shipper_city'] = $shipper_details->city;
					$update_order_data['shipper_state'] = $shipper_details->state_name;
					$update_order_data['shipper_country'] = $shipper_details->county_name;
					$update_order_data['shipper_zipcode'] = $shipper_details->zip;
					//$update_order_data['androidDeviceToken']=$shipper_details->androidDeviceToken;
					//$update_order_data['iosDeviceToken']=$shipper_details->iosDeviceToken;

					$time_and_distance = [
						'store_address' => $shipper_details->address_1,
						'store_city' => $shipper_details->city,
						'store_state' => $shipper_details->state_name,
						'store_country' => $shipper_details->county_name,
						'store_zip_code' => $shipper_details->zip,
						'address' => $order_data['address'],
						'city' => $order_data['city'],
						'state' => $order_data['state'],
						'country' => $order_data['country'],
						'zip_code' => $order_data['zip_code'],
					];
					/*$time_and_distance=[
						'store_address' => '13 adams road',
						'store_city' => 'Kendall Park',
						'store_state' => 'New Jersey',
						'store_country' => 'US',
						'store_zip_code' => '08824',
						'address' => '',
						'city' => 'Monmouth Junction',
						'state' => 'New Jersey',
						'country' => 'US',
						'zip_code' => '08852',
					];
					*/
					$dis_time = new ScanSellc();
					$b = $dis_time->exactDistance($time_and_distance);
					$distance11 = $b['distance'];
					$distance = (int) filter_var($distance11, FILTER_SANITIZE_NUMBER_INT);
					$time = $b['time'];
					$totalDistance = round($distance, 2);
					$driver = new Driver();

					$driver->saveTimeDistance(
						[
							'order_id' => $order_id,
							'time' => $time,
							'distance' => $totalDistance . ' Miles',
							'pick_lat' => $b['pick_lat'] ?? '',
							'pick_long' => $b['pick_long'] ?? '',
							'drop_lat' => $b['drop_lat'] ?? '',
							'drop_long' => $b['drop_long'] ?? '',
						]
					);
				}
				$this->db = DB::table('wh_shipper_order');
				$this->db->where(array('id' => $order_id));
				$this->db->update($update_order_data);
				if ($order_data['order_reference'] == 'EXTERNALORDER') {
					DB::table('wh_shipper_order_driver')
						->insert(
							['order_id' => $order_id, 'driver_id' => $order_data['driver_id'], 'status' => 1]
						);

					$actual_time = explode(' ', $time);
					$today_date_time = date('Y-m-d H:i:s');
					$actual_to_be_delivered_on = strtotime($today_date_time . ' + ' . ($actual_time[0] + 5) . ' minute');

					DB::table('wh_shipper_order_driver_status')
						->insert(
							[
								'driver_id' => $order_data['driver_id'],
								'order_id' => $order_id,
								'accepted' => 1,
								'accepted_datetime' => $today_date_time,
								'to_be_delivered_on' => date('Y-m-d H:i:s', $actual_to_be_delivered_on)
							]
						);

					$this->db = DB::table('wh_shipper_order');
					$this->db->where(array('id' => $order_id));
					$this->db->update(['delivery_type' => 'driver','accepted'=>'Y','accepted_time'=>now()]);
				}


				//$order_data['orderMetaData']

				if (isset($order_data['orderMetaData'])) {

					$this->addOrderMetaData($order_data);
				}

				if (isset($order_data['coupon_id'])) {
					if ($order_data['coupon_id'] != 0) {
						$this->addCouponDetails($order_data);
					}
				}

				$this->destroyCart($order_data['user_id']);
				$data = [];
				$data['title'] = 'Order Received';
				$data['message'] = 'You received an order #' . $order_id;
				if ($shipper_details) {
					$data['user_id'] = $shipper_details->wh_account_id;
					$data['androidDeviceToken'] = $shipper_details->androidDeviceToken;
					$data['iOSdeviceToken'] = $shipper_details->iosDeviceToken;
				} else {
					$data['user_id'] = 0;
					$data['androidDeviceToken'] = '';
					$data['iOSdeviceToken'] = '';
				}


				$data['order_id'] = $order_id;
				$data['app'] = 'shipting';

				$namespace = 'App\Http\Controllers';
				$ScanSell = app()->make($namespace . '\ScanSellc');
				$sendShiptingNotification = $ScanSell->sendShiptingNotification($data);



				if ($order_data['payment_status']) {
					return ['status' => 1, 'order_id' => $order_id, 'payment_status' => $order_data['payment_status'], 'message' => 'Yay! Your order is being processed', 'shipper_details' => $shipper_details];
				} else {
					return ['status' => 1, 'order_id' => $order_id, 'payment_status' => $order_data['payment_status'], 'message' => 'Payment failed', 'shipper_details' => $shipper_details];
				}
			} else {
				return ['status' => 0, 'order_id' => 0, 'message' => 'Something went wrong!'];
			}
		}
	}
	function deleteOrder($user_id)
	{
		$this->db = DB::table('wh_shipper_order as o');
		$this->db->select([
			"o.id",
		]);
		$this->db->where(['o.customer_id' => $user_id]);
		$result = $this->db->get();
		if ($result) {
			foreach ($result as $row) {
				DB::table('ai_order_payment_calculation_data')->where(['order_id' => $row->id])->delete();
				DB::table('oc_coupon_history')->where(['order_id' => $row->id])->delete();
				DB::table('wh_shipper_order_product')->where(['order_id' => $row->id])->delete();
				DB::table('wh_shipper_order')->where(['id' => $row->id])->delete();
			}
			return ['status' => 1, 'code' => 200, 'message' => 'Order Deleted Successfully!'];
		} else {
			return ['status' => 0, 'code' => 402, 'message' => 'Something went wrong!'];
		}
		return $result;
	}


	function deleteCart($user_id)
	{
		$this->db = DB::table('ai_cart as c');
		$this->db->select([
			"c.cart_id",
			"c.user_id",
		]);
		$this->db->where(['c.user_id' => $user_id]);
		$result = $this->db->get()->first();
		if ($result) {
			DB::table('ai_cart_details')->where(['cart_id' => $result->cart_id])->delete();
			DB::table('ai_cart')->where(['cart_id' => $result->cart_id])->delete();
			return ['status' => 1, 'code' => 200, 'message' => 'Cart Deleted Successfully!'];
		} else {
			return ['status' => 0, 'code' => 402, 'message' => 'Something went wrong!'];
		}
		return $result;
	}

	function deleteUser($user_id)
	{
		$this->db = DB::table('ai_users as u');
		$this->db->select([
			"u.id",
		]);
		$this->db->where(['u.id' => $user_id]);
		$result = $this->db->get()->first();
		if ($result) {
			DB::table('ai_users')->where(['id' => $user_id])->delete();
			return ['status' => 1, 'code' => 200, 'message' => 'User Deleted Successfully!'];
		} else {
			return ['status' => 0, 'code' => 402, 'message' => 'Something went wrong!'];
		}
		return $result;
	}

	function deleteWishList($user_id)
	{
		$this->db = DB::table('ai_wishlist as w');
		$this->db->select([
			"w.wishlist_id",
			"w.user_id",
		]);
		$this->db->where(['w.user_id' => $user_id]);
		$result = $this->db->get()->first();
		if ($result) {
			DB::table('ai_wishlist_details')->where(['wishlist_id' => $result->wishlist_id])->delete();
			DB::table('ai_wishlist')->where(['wishlist_id' => $result->wishlist_id])->delete();
			return ['status' => 1, 'code' => 200, 'message' => 'Wishlist Deleted Successfully!'];
		} else {
			return ['status' => 0, 'code' => 402, 'message' => 'Something went wrong!'];
		}
		return $result;
	}

	function orderListTotal($where, $options)
	{

		$status_type = $options['status_type'];
		$search_string = $options['search_string'];
		if ($status_type) {
			//$search_string = "";
			if ($status_type == 'open_order') {
				$where['o.delivered'] = 'N';
				$where['o.cancelled'] = 'N';
			} else if ($status_type == 'delivered') {
				$where['o.delivered'] = 'Y';
				$where['o.cancelled'] = 'N';
			} else if ($status_type == 'cancelled') {
				$where['o.cancelled'] = 'Y';
			} else {
				$where['o.cancelled'] = 'NOT AVAILABLE';
			}
		}

		//DB::enableQueryLog(); 
		$this->db = DB::table('wh_shipper_order as o');
		$this->db->select([
			"o.customer_id",
			"o.shipper_id",
			"o.name",
			"o.invoice_no",
			"o.phone",
			"o.country",
			"o.city",
			"o.state",
			"o.email",
			"o.total_amount",
			"o.address",
			"o.address_name",
			"o.zip_code",
			"o.id",
			"o.order_date",
			"o.payment_method",
			"o.payment_id",
			"o.delivered",
			"o.delivered_time",
			"o.Shipped",
			"o.Shipped_time",
			"o.packed",
			"o.packed_time",
			"o.accepted",
			"o.accepted_time",
			"o.cancelled",
			"o.cancelled_time",
			"o.refunded",
			"o.refunded_time",
			"o.store_rating",
			"o.delivery_rating",
			"o.customer_message",
			"o.shipper_company_name",
			"o.shipper_name",
			"o.shipper_phone",
			"o.shipper_email",
			"o.shipper_address",
			"o.shipper_city",
			"o.shipper_state",
			"o.shipper_country",
			"o.shipper_zipcode",
			"o.discounted_amount_after_coupon",
			"o.coupon_id",
			"opcd.calculated_orderMetaData"
		]);

		$this->db->join('wh_shipper_order_product as op', 'op.order_id', '=', 'o.id');
		$this->db->leftjoin('ai_order_payment_calculation_data as opcd', 'opcd.order_id', '=', 'o.id');
		//$this->db->join('oc_coupon_history as ch', 'ch.order_id','=','o.id'); 
		$this->db->join('wh_producttoshipper as wp', 'wp.id', '=', 'op.product_id');
		$this->db->leftjoin('ai_product as p', 'op.ai_product_id', '=', 'p.ai_product_id');
		if (count($where)) {
			$this->db->where($where);
		}

		if ($search_string) {
			$this->db->Where(function ($query) use ($search_string) {
				$query->where('o.name', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.phone', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.city', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.email', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.state', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.total_amount', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.address', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.zip_code', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.id', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.customer_message', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.shipper_company_name', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.shipper_name', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.shipper_zipcode', 'LIKE', '%' . $search_string . '%')
					->orWhere('op.title', 'LIKE', '%' . $search_string . '%')
					->orWhere('op.price', 'LIKE', '%' . $search_string . '%')
					->orWhere('p.weight', 'LIKE', '%' . $search_string . '%')
					//->orWhere('wp.discount', 'LIKE', '%'.$search_string.'%') 
					->orWhere('p.upc', 'LIKE', '%' . $search_string . '%')
					//->orWhere('p.title', 'LIKE', '%'.$search_string.'%')		
					->orWhere('p.ean', 'LIKE', '%' . $search_string . '%')
					->orWhere('p.description', 'LIKE', '%' . $search_string . '%')
					->orWhere('p.brand', 'LIKE', '%' . $search_string . '%')
					->orWhere('p.model', 'LIKE', '%' . $search_string . '%')
					->orWhere('p.color', 'LIKE', '%' . $search_string . '%');
				//->orWhere('p.size', 'LIKE', '%'.$search_string.'%')	 
				//->orWhere('p.dimension', 'LIKE', '%'.$search_string.'%')

			});
		}

		$this->db->groupBy("o.id");
		$this->db->orderBy("o.id", "DESC");
		$result = $this->db->get();
		return count($result);
	}

	function orderList($where, $options)
	{

		$status_type = $options['status_type'];
		$search_string = $options['search_string'];
		$limit1 = $options['limit1'];
		$limit2 = $options['limit2'];

		if ($status_type) {
			//$search_string = "";
			if ($status_type == 'open_order') {
				$where['o.delivered'] = 'N';
				$where['o.cancelled'] = 'N';
			} else if ($status_type == 'delivered') {
				$where['o.delivered'] = 'Y';
				$where['o.cancelled'] = 'N';
			} else if ($status_type == 'cancelled') {
				$where['o.cancelled'] = 'Y';
			} else {
				$where['o.cancelled'] = 'NOT AVAILABLE';
			}
		}

		//DB::enableQueryLog(); 
		$this->db = DB::table('wh_shipper_order as o');
		$this->db->select([
			"o.customer_id",
			"o.shipper_id",
			"o.name",
			"o.invoice_no",
			"o.phone",
			"o.country",
			"o.city",
			"o.state",
			"o.email",
			"o.total_amount",
			"o.address",
			"o.address_name",
			"o.order_reference",
			"o.zip_code",
			"o.id",
			"o.order_date",
			"o.payment_method",
			"o.payment_status",
			"o.payment_id",
			"o.delivered",
			"o.delivered_time",
			"o.Shipped",
			"o.Shipped_time",
			"o.packed",
			"o.packed_time",
			"o.accepted",
			"o.accepted_time",
			"o.cancelled",
			"o.cancelled_time",
			"o.refunded",
			"o.refunded_time",
			"o.store_rating",
			"o.delivery_rating",
			"o.customer_message",
			"o.shipper_company_name",
			"o.shipper_name",
			"o.shipper_phone",
			"o.shipper_email",
			"o.shipper_address",
			"o.shipper_city",
			"o.shipper_state",
			"o.shipper_country",
			"o.shipper_zipcode",
			"o.discounted_amount_after_coupon",
			"o.coupon_id",
			"o.booking_id",
			"opcd.calculated_orderMetaData",
			"sods.driver_id",
			"wu.firstname as driver_firstname",
			"wu.lastname as driver_lastname",
			"wu.telephone as driver_phone",
			"wu.driver_status as driver_status",
			"wu.profile_img as driver_profile_img",
			"sods.accepted as driver_accepted",
			"sods.accepted_datetime",
			"sods.to_be_delivered_on",
			"sods.go_to_pickup",
			"sods.go_to_pickup_date_time",
			"sods.confirm_pickup",
			"sods.confirm_pickup_datetime",
			"sods.reached_at_store",
			"sods.reached_at_store_date_time",
			"sods.on_the_way_to_the_customer",
			"sods.on_the_way_to_the_customer_date_time",
			"sods.reached_at_customer",
			"sods.reached_at_customer_date_time",
			"sods.delivered as driver_delivered",
			"sods.delivered_datetime",
			"sods.driver_note",
			"sods.visible_drunk",
			"sods.package_received_by",
			"sods.delivery_proof_file_name",
			"sods.delivery_proof_file_path",
			"sods.customer_signature_file_name",
			"sods.customer_signature_file_path",
			"sods.confirm_pickup_by_driver",
			"sods.confirm_pickup_driver_datetime",
			"sotd.time",
			"sotd.distance",
			"sotd.pickup_lat",
			"sotd.pickup_long",
			"sotd.drop_lat",
			"sotd.drop_long",
		]);

		$this->db->join('wh_shipper_order_product as op', 'op.order_id', '=', 'o.id');
		$this->db->leftjoin('ai_order_payment_calculation_data as opcd', 'opcd.order_id', '=', 'o.id');
		$this->db->leftjoin('wh_shipper_order_driver_status as sods', 'sods.order_id', '=', 'o.id');
		$this->db->leftJoin('wh_shipper_order_time_distance AS sotd', 'sotd.order_id', '=', 'o.id');
		$this->db->leftJoin('wh_warehouse_user AS wu', 'wu.id', '=', 'sods.driver_id');

		//$this->db->join('oc_coupon_history as ch', 'ch.order_id','=','o.id'); 
		$this->db->join('wh_producttoshipper as wp', 'wp.id', '=', 'op.product_id');
		$this->db->leftjoin('ai_product as p', 'op.ai_product_id', '=', 'p.ai_product_id');
		if ($options['limit_id'] > 0) {
			$this->db->where('o.id', '<', $options['limit_id']);
		}
		if (count($where)) {
			//echo "<pre>"; print_r($where);
			$this->db->where($where);
		}

		if ($search_string) {
			//echo "<pre>"; print_r($search_string);
			$this->db->Where(function ($query) use ($search_string) {
				$query->where('o.name', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.phone', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.city', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.email', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.state', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.total_amount', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.address', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.zip_code', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.id', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.customer_message', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.shipper_company_name', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.shipper_name', 'LIKE', '%' . $search_string . '%')
					->orWhere('o.shipper_zipcode', 'LIKE', '%' . $search_string . '%')
					->orWhere('op.title', 'LIKE', '%' . $search_string . '%')
					->orWhere('op.price', 'LIKE', '%' . $search_string . '%')
					->orWhere('p.weight', 'LIKE', '%' . $search_string . '%')
					//->orWhere('wp.discount', 'LIKE', '%'.$search_string.'%') 
					->orWhere('p.upc', 'LIKE', '%' . $search_string . '%')
					//->orWhere('p.title', 'LIKE', '%'.$search_string.'%')		
					->orWhere('p.ean', 'LIKE', '%' . $search_string . '%')
					->orWhere('p.description', 'LIKE', '%' . $search_string . '%')
					->orWhere('p.brand', 'LIKE', '%' . $search_string . '%')
					->orWhere('p.model', 'LIKE', '%' . $search_string . '%')
					->orWhere('p.color', 'LIKE', '%' . $search_string . '%');
				//->orWhere('p.size', 'LIKE', '%'.$search_string.'%')	 
				//->orWhere('p.dimension', 'LIKE', '%'.$search_string.'%')

			});
		}

		$this->db->groupBy("o.id");
		$this->db->orderBy("o.id", "DESC");
		$this->db->offset($limit1);
		$this->db->limit($limit2);
		$result = $this->db->get();
		//$result=$this->db->toSql();();
		//dd(DB::getQueryLog()); // Show results of log
		//Log::info($result);
		return $result;
	}
	function orderDetails($where)
	{
		$this->db = DB::table('wh_shipper_order_product as op');
		$this->db->select(
			[
				"op.id",
				"op.order_id",
				"op.product_id",
				"op.title",
				"op.image",
				"op.quantity",
				"op.price",
				"op.id",
				"op.total_price",
				"p.weight",
				"p.weight",
				"c.name as ai_category_name",
				"op.qrcode_url",
				"op.product_discount as discount",
				"op.total_discounted_price",
				'wp.product_variation',
				'wp.variation_type',
				'wp.parent_product_id',
				'wp.variation_category_name',
				'wp.variation_name_value',
				'wp.event_location',
				'wp.event_date_time',
				'wp.ai_category_id',
				DB::raw("round((op.price) - ( (op.product_discount/100) * (op.price) ),2 ) as discounted_price")
			]
		);
		$this->db->join('wh_producttoshipper as wp', 'wp.id', '=', 'op.product_id');
		$this->db->leftjoin('ai_product as p', 'op.ai_product_id', '=', 'p.ai_product_id');
		$this->db->leftjoin('ai_category as c', 'wp.ai_category_id', '=', 'c.id');

		if (count($where)) {
			$this->db->where($where);
		}
		$this->db->orderBy("op.id", "DESC");
		$result = $this->db->get();
		return $result;
	}


	function viewCustomerProfile($where)
	{
		if (count($where)) {
			$this->db = DB::table('ai_users AS u');
			$this->db->select([
				"u.id",
				"u.name",
				"u.email",
				"u.email_verified_status",
				"u.role",
				"u.phone",
				"u.country",
				"u.country_code",
				"u.state",
				"u.city",
				"u.address",
				"u.zipcode"
			]);
			$this->db->where($where);
			$profile_details = $this->db->get()->first();
			return $profile_details;
		}
		return false;
	}
	function updateCustomerProfile($data)
	{
		if (count($data)) {
			$this->db = DB::table('ai_users');
			$this->db->where(array('id' => $data['id']));
			$this->db->update(
				[
					'name' => $data['name'],
					'country' => $data['country'],
					'city' => $data['city'],
					'state' => $data['state'],
					'address' => $data['address'],
					'zipcode' => $data['zipcode']
				]
			);
			return $this->getUserDetails(array('id' => $data['id']));
		}
		return false;
	}
	function updateCustomerData($data)
	{
		if (count($data)) {
			if ($data['key'] != 'name') {
				$user_details = $this->getUserDetails(array('id' => $data['user_id']));
				if ($user_details) {
					$email = $user_details->email;
					$phone = $user_details->phone;
					if ($data['value'] == $email || $data['value'] == $phone) {
						return ['status' => 0, 'case' => 1, 'code' => 402, 'message' => "Your old " . $data['key'] . " and new " . $data['key'] . " is same", 'data' => $this->getUserDetails(array('id' => $data['user_id']))];
					} else {
						$this->db = DB::table('ai_users');
						$this->db->where('id', '<>', $data['user_id']);
						$this->db->where(array($data['key'] => $data['value']));
						$result = $this->db->get();
						if (count($result)) {
							if ($data['key'] == 'phone') {
								return ['status' => 0, 'case' => 2, 'code' => 402, 'message' => "This phone number already exists!", 'data' => $this->getUserDetails(array('id' => $data['user_id']))];
							} else if ($data['key'] == 'email') {
								return ['status' => 0, 'case' => 2, 'code' => 402, 'message' => "This email address already exists!", 'data' => $this->getUserDetails(array('id' => $data['user_id']))];
							} else {
								return ['status' => 0, 'case' => 2, 'code' => 402, 'message' => 'This ' . ucfirst($data['key']) . " already exists!", 'data' => $this->getUserDetails(array('id' => $data['user_id']))];
							}
						} else {
							$update_data = [];
							$update_data['new_' . $data['key']] = $data['value'];
							$update_data[$data['key'] . '_verification_otp'] = $data['otp'];
							if (!empty($data['country_code'])) {
								$update_data['new_country_code'] = $data['country_code'];
							}
							$this->db = DB::table('ai_users');
							$this->db->where(array('id' => $data['user_id']));
							$this->db->update($update_data);
							return ['status' => 1, 'case' => 3, 'code' => 200, 'message' => "OTP successfully sent on your " . $data['key'] . "!", 'data' => $this->getUserDetails(array('id' => $data['user_id']))];
						}
					}
				} else {
					return ['status' => 0, 'case' => 5, 'code' => 402, 'message' => "Something went wrong!", 'data' => (object)[]];
				}
			} else {
				$this->db = DB::table('ai_users');
				$this->db->where(array('id' => $data['user_id']));
				$this->db->update(
					[
						$data['key'] => $data['value'],
					]
				);
				return ['status' => 1, 'case' => 4, 'code' => 200, 'message' => "Your " . $data['key'] . " has been updated successfully!", 'data' => $this->getUserDetails(array('id' => $data['user_id']))];
			}
		}
		return false;
	}

	function activateNewCartClearOldCart($user_id, $session_id)
	{
		$this->destroyCart($user_id);
		$this->db = DB::table('ai_cart');
		$this->db->where(array('user_id' => $session_id));
		$this->db->update(['user_id' => $user_id]);
		return ['status' => 1, 'case' => 1];
	}

	function activateOldCartClearNewCart($session_id)
	{
		$this->destroyCart($session_id);
		return ['status' => 1, 'case' => 1];
	}


	function updateProductCartQuantity($data)
	{
		if (count($data)) {
			$this->db = DB::table('ai_cart_details');
			$this->db->select(["product_id", "quantity", "cart_id"]);
			$this->db->where(array('id' => $data['cart_detail_id']));
			$cart_details = $this->db->get()->first();
			$total_cart = $this->totalCartItem($data['user_id']);
			if ($cart_details) {
				$product_id = $cart_details->product_id;
				$cart_id = $cart_details->cart_id;
				$this->db = DB::table('ai_product as p');
				$this->db->select(["p.ai_product_id", "wp.quantity", "wp.ordered_qty", DB::raw("(wp.quantity-ifnull(wp.ordered_qty,0)) as total_product_quantity")]);
				$this->db->join('wh_producttoshipper as wp', 'wp.ai_product_id', '=', 'p.ai_product_id');
				$this->db->where(['wp.id' => $product_id]);
				$result = $this->db->get()->first();
				if (!$result) {
					$this->db = DB::table('oc_product as p');
					$this->db->select(["p.product_id as ai_product_id", "wp.quantity", "wp.ordered_qty", DB::raw("(wp.quantity-ifnull(wp.ordered_qty,0)) as total_product_quantity")]);
					$this->db->join('wh_producttoshipper as wp', 'wp.ai_product_id', '=', 'p.product_id');
					$this->db->where(['wp.product_type' => 'ECOM']);
					$this->db->where(['wp.id' => $product_id]);
					$result = $this->db->get()->first();
				}

				if ($result) {
					$total_product_quantity = $result->total_product_quantity;
					if ($total_product_quantity >= $data['quantity']) {
						$this->db = DB::table('ai_cart_details');
						$this->db->where(array('id' => $data['cart_detail_id']));
						$this->db->update(['quantity' => $data['quantity']]);


						$getCartDetails = $this->getCartDetails($data['user_id']);

						if (isset($data['order_origin'])) {
							$cart_total['order_origin'] = $data['order_origin'];
						} else {
							$cart_total['order_origin'] = "";
						}

						//$cart_total['order_origin'] = $data['order_origin'];
						$cart_total['shipper_id'] = $getCartDetails['shipper_id'];
						$cart_total['ai_category_id'] = $getCartDetails['ai_category_id'];
						$cart_total['sub_total_amount'] = $getCartDetails['sub_total_amount'];
						$cart_total['discount_amount'] = $getCartDetails['discount_amount'];
						$cart_total['discounted_price'] = $getCartDetails['discounted_price'];


						if (isset($data['coupon_id'])) {
							$coupon_id = $data['coupon_id'];

							$coupon = new Reviews();

							$couponData['coupon_id'] = $coupon_id;
							$couponData['user_id'] = $data['user_id'];
							$couponData['order_origin'] = $data['order_origin'] ? $data['order_origin'] : '';

							$getCoupon = (array) $coupon->getCouponList($couponData);

							if (isset($getCoupon['total_discount'])) {

								$coupon_discount = $getCoupon['total_discount'];
								$discounted_price_after_coupon = $getCoupon['discounted_total'];
							} else {
								$coupon_id = "";
								$getCoupon = null;
								$coupon_discount = 0;
								$discounted_price_after_coupon = $cart_total['discounted_price'];
							}
							//print_r($getCoupon); die;

						} else {
							$coupon_id = "";
							$getCoupon = null;
							$coupon_discount = 0;
							$discounted_price_after_coupon = $cart_total['discounted_price'];
						}

						$cart_total['coupon_discount'] = $coupon_discount;
						$cart_total['discounted_price_after_coupon'] = $discounted_price_after_coupon;



						$getOrderMetaData = $this->getOrderMetaData($cart_total);
						//$couponDetail=$getCoupon;



						return ['status' => 1, 'ww' => 879, 'code' => 200, 'message' => 'Product Quantity has been updated successfully.', 'data' => (object)['cart_detail_id' => $data['cart_detail_id'], 'quantity' => $data['quantity'], 'cart_id' => $cart_id, 'product_id' => $product_id, 'OrderMetaData' => $getOrderMetaData, "couponDetail" => $getCoupon], 'old_quantity' => $cart_details->quantity, 'total_cart' => $total_cart];
					} else {
						return ['status' => 0, 'code' => 402, 'message' => "That's all we have in stock at the moment!", 'data' => (object)[], 'old_quantity' => $cart_details->quantity, 'total_cart' => $total_cart];
					}
				}
				return ['status' => 0, 'old_quantity' => $cart_details->quantity, 'code' => 402, 'message' => 'Something Went wrong!', 'data' => (object)[], 'total_cart' => $total_cart];
			} else {
				return ['status' => 0, 'old_quantity' => $data['quantity'], 'code' => 402, 'message' => 'Something Went wrong!', 'data' => (object)[], 'total_cart' => $total_cart];
			}
		}
	}


	function orderExistance($where)
	{
		if (count($where)) {
			$this->db = DB::table('wh_shipper_order as so');
			$this->db->select([
				"so.id",
				"so.zip_code",
				"so.shipper_id"
			]);
			$this->db->where($where);
			return $this->db->get()->first();
		}
	}
	function getUserDetails($where)
	{
		if (count($where)) {
			$this->db = DB::table('ai_users');
			$this->db->select([
				"id",
				"email",
				"name",
				"country_code",
				"new_country_code",
				"phone",
				"email_verified_at",
				"email_verification_otp",
				"email_verified_status",
				"phone_verified_status",
				"phone_verification_otp",
				"password",
				"referred_code",
				"country",
				"state",
				"city",
				"zipcode",
				"address"
			]);
			$this->db->where($where);
			return $this->db->get()->first();
		}
	}

	function customerRegistration($data)
	{
		if (count($data)) {
			$user_email_existance = $this->getUserDetails(array('email' => $data['email']));
			if (!$user_email_existance) {
				$user_phone_existance = $this->getUserDetails(array('phone' => $data['phone']));
				if (!$user_phone_existance) {
					DB::table('ai_users')
						->insert(
							[
								'name' => $data['name'],
								'email' => $data['email'],
								'country_code' => $data['country_code'],
								'phone' => $data['phone'],
								'password' => $data['password'],
								'referred_code' => $data['referred_code'],
								'email_verification_otp' => $data['otp'],
								'phone_verification_otp' => $data['otp']
							]
						);
					$user_id = DB::getPdo()->lastInsertId();
					if ($user_id) {
						$data['otp'] = '';
						return ['status' => 1, 'user_id' => $user_id, 'data' => $data, 'message' => 'Congratulations! Your registration has been completed successfully.'];
					} else {
						return ['status' => 0, 'user_id' => 0, 'data' => (object)[], 'message' => 'Something went wrong!'];
					}
				} else {
					return ['status' => 0, 'user_id' => 0, 'data' => (object)[], 'message' => 'This phone number already exists'];
				}
			} else {
				return ['status' => 0, 'user_id' => 0, 'data' => (object)[], 'message' => 'This email address already exists'];
			}
		}
	}
	function addNewCustomer($data)
	{
		if (count($data)) {
			DB::table('ai_users')
				->insert(
					[
						'name' => $data['name'],
						'email' => $data['email'],
						'phone' => $data['phone'],
					]
				);
			$user_id = DB::getPdo()->lastInsertId();
			if ($user_id) {
				return ['status' => 1, 'code' => 200, 'user_id' => $user_id, 'data' => $data, 'message' => 'Congratulations! Your registration has been completed successfully.'];
			} else {
				return ['status' => 0, 'code' => 402, 'user_id' => 0, 'data' => (object)[], 'message' => 'Something went wrong!'];
			}
		}
	}
	function customerEmailVerification($data)
	{
		if (count($data)) {
			$user_existance = $this->getUserDetails(array('email' => $data['email']));
			if ($user_existance) {
				if ($user_existance->email_verified_status) {
					return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'Email verified!'];
				} else {
					if ($user_existance->email_verification_otp == $data['otp']) {
						$this->db = DB::table('ai_users');
						$this->db->where(array('id' => $user_existance->id));
						$this->db->update(['email_verification_otp' => 0, 'email_verified_status' => 1, 'email_verified_at' => now()]);
						return ['status' => 1, 'code' => 200, 'data' => (object)['id' => $user_existance->id], 'message' => 'Your email Verification has been completed successfully.'];
					} else {
						return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'Invalid OTP!'];
					}
				}
			} else {
				return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'This email address does not exist'];
			}
		}
	}

	function customerEmailVerificationForUpdate($data)
	{
		if (count($data)) {
			$user_existance = $this->getUserDetails(array('new_email' => $data['email']));
			if ($user_existance) {
				if ($user_existance->email_verification_otp == $data['otp']) {
					$this->db = DB::table('ai_users');
					$this->db->where(array('id' => $user_existance->id));
					$this->db->update(['new_email' => '', 'email' => $data['email'], 'email_verification_otp' => 0, 'email_verified_status' => 1, 'email_verified_at' => now()]);
					return ['status' => 1, 'code' => 200, 'data' => (object)$this->getUserDetails(['id' => $user_existance->id]), 'message' => 'Your email Verification has been completed successfully.'];
				} else {
					return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'Invalid OTP!'];
				}
			} else {
				return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'This email address does not exist'];
			}
		}
	}

	function customerEmailCheckOtp($data)
	{
		if (count($data)) {
			$user_existance = $this->getUserDetails(array('email' => $data['email']));
			if ($user_existance) {
				if ($user_existance->email_verification_otp == $data['otp']) {
					return ['status' => 1, 'code' => 200, 'data' => (object)$this->getUserDetails(['id' => $user_existance->id]), 'message' => 'OTP Verified'];
				} else {
					return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'Invalid OTP!'];
				}
			} else {
				return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'This email address does not exist'];
			}
		}
	}
	function customerPhoneCheckOtp($data)
	{
		if (count($data)) {
			$user_existance = $this->getUserDetails(array('phone' => $data['phone']));
			if ($user_existance) {
				if ($user_existance->phone_verification_otp == $data['otp']) {
					$this->db = DB::table('ai_users');
					$this->db->where(array('id' => $user_existance->id));
					$this->db->update(['phone_verification_otp' => 0, 'phone_verified_status' => 1, 'phone_verified_at' => now()]);
					return ['status' => 1, 'code' => 200, 'data' => (object)['id' => $user_existance->id], 'message' => 'OTP Verified'];
				} else {
					return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'Invalid OTP!'];
				}
			} else {
				return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'This Phone number does not exist'];
			}
		}
	}


	function customerEmailverificationResendOtp($data)
	{
		if (count($data)) {
			$user_existance = $this->getUserDetails(array('email' => $data['email']));
			if ($user_existance) {
				if ($user_existance->email_verified_status) {
					return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'Your email verification is already completed.'];
				} else {
					return ['status' => 1, 'code' => 200, 'data' => (object)['id' => $user_existance->id, 'name' => $user_existance->name], 'id' => $user_existance->id, 'name' => $user_existance->name, 'message' => 'OTP sent successfully.'];
				}
			} else {
				return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'This email address does not exist'];
			}
		}
	}



	function customerEmailSentOtp($data)
	{
		if (count($data)) {
			$user_existance = $this->getUserDetails(array('email' => $data['email']));
			if ($user_existance) {
				return ['status' => 1, 'message' => 'Otp Sent on ' . $data['email'] . ' successfully', 'code' => 200, 'data' => (object)['id' => $user_existance->id, 'name' => $user_existance->name], 'id' => $user_existance->id, 'name' => $user_existance->name];
			} else {
				return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'This email address does not exist'];
			}
		}
	}
	function updateUserDetails($data)
	{
		if (count($data)) {
			$this->db = DB::table('ai_users');
			$this->db->where(array('id' => $data['id']));
			$result = $this->db->update(['email_verification_otp' => $data['email_verification_otp']]);
			if ($result) {
				return ['status' => 1, 'message' => 'Otp Sent'];
			} else {
				return ['status' => 0, 'message' => 'Failure'];
			}
		}
	}

	function customerPhoneVerification($data)
	{
		if (count($data)) {
			$user_existance = $this->getUserDetails(array('phone' => $data['phone']));
			if ($user_existance) {
				if ($user_existance->phone_verified_status) {
					return ['status' => 0, 'message' => 'This phone verification has already completed.'];
				} else {
					if ($user_existance->phone_verification_otp == $data['otp']) {
						$this->db = DB::table('ai_users');
						$this->db->where(array('id' => $user_existance->id));
						$this->db->update(['phone_verification_otp' => 0, 'phone_verified_status' => 1, 'phone_verified_at' => now()]);
						if (!empty($user_existance->referred_code)) {
							$ReferralData['user_id'] = $user_existance->id;
							$ReferralData['referral_code'] = $user_existance->referred_code;
							$this->applyReferredCode($ReferralData);
						}
						return ['status' => 1, 'code' => 200, 'data' => ['email' => $user_existance->email, 'name' => $user_existance->name], 'message' => 'Your phone Verification has been completed successfully.'];
					} else {
						return ['status' => 0, 'message' => 'Invalid OTP!'];
					}
				}
			} else {
				return ['status' => 0, 'message' => 'This phone number does not exist!'];
			}
		}
	}

	function applyReferredCode($ReferralData)
	{

		$user_id = $ReferralData['user_id'];
		$referral_code = $ReferralData['referral_code'];
		$date_start = date('Y-m-d');

		$date_end = date('Y-m-d', strtotime('15 days'));
		$referral_coupon_code =  wordwrap(strtoupper(bin2hex(random_bytes(8))), 4, "-", true);
		//echo wordwrap('123456789123456789', 3, "-", true);

		$query = DB::table('ai_users AS u');

		$query->select('u.id', 'u.referral_code', 'u.referral_prize');
		$query->where([['u.referral_code', '=', $referral_code]]);

		$getReferralCode = $query->get()->first();

		if (isset($getReferralCode->id)) {

			//create a coupon for  "$getReferralCode->id"

			$insert = DB::table('oc_coupon')->insertGetId(
				[
					'name' => $referral_code,
					'code' => $referral_coupon_code,
					'type' => 'S',
					'discount' => 100,
					'total' => 10,
					'min_amount' => 1,
					'date_start' => $date_start,
					'date_end' => $date_end,
					'uses_customer' => $getReferralCode->id,
					'status' => 1,
					'date_added' => $date_start

				]
			);

			DB::table('ai_referral_code_history')
				->insert(
					[
						'referral_user_id' => $getReferralCode->id,
						'referred_user_id' => $user_id,
						'referral_code' => $getReferralCode->referral_code,
						'referral_prize' => $getReferralCode->referral_prize,
						'date_added' => now(),
					]
				);



			$data = array("referral_user_id" => $getReferralCode->id, "referral_code" => $referral_code, "referred_user_id" => $user_id, "referral_prize" => $getReferralCode->referral_prize);

			//return ['status'=>1,'code'=>200,'data'=>$data,'message'=>'Referral code works'];
			return true;
		} else {
			//return ['status'=>0,'code'=>402,'message'=>'Referral code is not correct'];
			return false;
		}
	}

	function deleteCustomerAccount($data)
	{
		if (count($data)) {
			$user_existance = $this->getUserDetails(array('id' => $data['id']));
			if ($user_existance) {
				$result = DB::table('ai_users')->where($data)->delete();
				if ($result) {
					return ['status' => 1, 'code' => 200, 'data' => (object)[], 'message' => 'Your account has been deleted successfully.'];
				} else {
					return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'Something went wrong.'];
				}
			} else {
				return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'No record found!'];
			}
		}
	}


	function customerPhoneVerificationForUpdate($data)
	{
		if (count($data)) {
			$user_existance = $this->getUserDetails(array('new_phone' => $data['phone']));
			if ($user_existance) {
				if ($user_existance->phone_verification_otp == $data['otp']) {
					$this->db = DB::table('ai_users');
					$this->db->where(array('id' => $user_existance->id));
					$this->db->update(['new_phone' => '', 'new_country_code' => '', 'phone' => $data['phone'], 'country_code' => $user_existance->new_country_code, 'phone_verification_otp' => 0, 'phone_verified_status' => 1, 'phone_verified_at' => now()]);
					return ['status' => 1, 'code' => 200, 'data' => $this->getUserDetails(array('id' => $user_existance->id)), 'message' => 'Your phone Verification has been completed successfully.'];
				} else {
					return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'Invalid OTP!'];
				}
			} else {
				return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'This phone number does not exist!'];
			}
		}
	}
	function customerPhoneResendOtp($data)
	{
		if (count($data)) {
			$user_existance = $this->getUserDetails(array('phone' => $data['phone']));
			if ($user_existance) {
				$this->db = DB::table('ai_users');
				$this->db->where(array('id' => $user_existance->id));
				$this->db->update(['phone_verification_otp' => $data['otp'], 'phone_verified_status' => 0, 'phone_verified_at' => now()]);
				return ['status' => 1, 'country_code' => $user_existance->country_code, 'code' => 200, 'message' => 'OTP sent successfully.'];
			} else {
				return ['status' => 0, 'country_code' => '', 'message' => 'This phone number does not exist'];
			}
		}
	}


	function customerLogin($data)
	{
		if (count($data)) {
			$user_existance = $this->getUserDetails(array('email' => $data['email'], 'password' => $data['password']));
			if ($user_existance) {
				if (!$user_existance->email_verified_status) {
					return ['status' => 0, 'case' => 1, 'user_id' => 0, 'code' => 407, 'data' => (object)[], 'message' => 'Got a minute? Verify your account now!'];
				} else {

					// save and update device token

					if ($data['androidDeviceToken'] != "") {

						$this->db = DB::table('ai_users');
						$this->db->where(array('id' => $user_existance->id));
						$this->db->update(['androidDeviceToken' => $data['androidDeviceToken']]);
					}

					if ($data['iosDeviceToken'] != "") {

						$this->db = DB::table('ai_users');
						$this->db->where(array('id' => $user_existance->id));
						$this->db->update(['iosDeviceToken' => $data['iosDeviceToken']]);
					}

					return [
						'status' => 1,
						'case' => 2,
						'user_id' => $user_existance->id,
						'code' => 200,
						'data' => ['user_data' => $user_existance],
						'message' => 'Voila! You have logged in successfully.'
					];
				}
			} else {
				return ['status' => 0, 'case' => 3, 'user_id' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'Invalid email address or password!'];
			}
		}
	}

	function customerPhoneLogin($data)
	{
		if (count($data)) {
			$user_existance = $this->getUserDetails(array('phone' => $data['phone'], 'password' => $data['password']));
			if ($user_existance) {
				if (!$user_existance->phone_verified_status) {
					//send otp here
					return ['status' => 0, 'case' => 1, 'user_id' => 0, 'code' => 407, 'data' => (object)[], 'message' => 'Got a minute? Verify your account now!'];
				} else {
					$complete_name = explode(' ', $user_existance->name);
					$user_existance->display_name = $complete_name[0];

					if ($data['androidDeviceToken'] != "") {

						$this->db = DB::table('ai_users');
						$this->db->where(array('id' => $user_existance->id));
						$this->db->update(['androidDeviceToken' => $data['androidDeviceToken']]);
					}

					if ($data['iosDeviceToken'] != "") {

						$this->db = DB::table('ai_users');
						$this->db->where(array('id' => $user_existance->id));
						$this->db->update(['iosDeviceToken' => $data['iosDeviceToken']]);
					}

					return [
						'status' => 1,
						'case' => 2,
						'user_id' => $user_existance->id,
						'code' => 200,
						'data' => ['user_data' => $user_existance],
						'message' => 'Voila! You have logged in successfully.'
					];
				}
			} else {
				return ['status' => 0, 'case' => 3, 'user_id' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'Invalid Phone or password!'];
			}
		}
	}
	function customerResetPassword($data)
	{
		if (count($data)) {
			$user_existance = $this->getUserDetails(array('email' => $data['email']));
			if ($user_existance) {
				if ($user_existance->password == $data['password']) {
					return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'Your new password and old password can not be same!'];
				} else {
					$this->db = DB::table('ai_users');
					$this->db->where(array('id' => $user_existance->id));
					$this->db->update(['password' => $data['password']]);
					return ['status' => 1, 'code' => 200, 'data' => (object)['id' => $user_existance->id], 'message' => 'Your password has been created successfully.'];
				}
			} else {
				return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'This email address does not exist'];
			}
		}
	}

	function customerResetPhonePassword($data)
	{
		if (count($data)) {
			$user_existance = $this->getUserDetails(array('phone' => $data['phone']));
			if ($user_existance) {
				if ($user_existance->password == $data['password']) {
					return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'Your new password and old password can not be same!'];
				} else {
					$this->db = DB::table('ai_users');
					$this->db->where(array('id' => $user_existance->id, 'phone_verification_otp' => 0, 'phone_verified_status' => 1));
					$this->db->update(['password' => $data['password']]);
					return ['status' => 1, 'code' => 200, 'data' => ['id' => $user_existance->id, 'email' => $user_existance->email, 'name' => $user_existance->name], 'message' => 'Your password has been created successfully.'];
				}
			} else {
				return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'This email address does not exist'];
			}
		}
	}

	function addAddress($data)
	{
		if (count($data)) {
			DB::table('wh_shipper_order_address')
				->insert(
					[
						'customer_id' => $data['user_id'],
						'address_name' => $data['address_name'],
						'name' => $data['name'],
						'phone' => $data['phone'],
						'email' => $data['email'] ? $data['email'] : '',
						'address' => $data['address'],
						'address2' => $data['address2'],
						'city' => $data['city'],
						'state' => $data['state'],
						'country' => $data['country'],
						'zip_code' => $data['zip_code'],
					]
				);
			return DB::getPdo()->lastInsertId();
		} else {
			return false;
		}
	}
	function updateAddress($data)
	{
		if (count($data)) {
			$this->db = DB::table('wh_shipper_order_address');
			$this->db->where(['address_id' => $data['address_id']]);
			$this->db->update([
				'customer_id' => $data['user_id'],
				'address_name' => $data['address_name'],
				'name' => $data['name'],
				'phone' => $data['phone'],
				'email' => $data['email'] ? $data['email'] : '',
				'address' => $data['address'],
				'address2' => $data['address2'],
				'city' => $data['city'],
				'state' => $data['state'],
				'country' => $data['country'],
				'zip_code' => $data['zip_code'],
			]);
			return true;
		} else {
			return false;
		}
	}


	function getAddress($where, $shipper_id = 0, $product_type = null)
	{
		//DB::enableQueryLog(); 
		$this->db = DB::table('wh_shipper_order_address as o');
		$this->db->select([
			"o.address_id",
			"o.customer_id",
			"o.address_name",
			"o.name",
			"o.email",
			"o.phone",
			"o.address",
			"o.address2",
			"o.city",
			"o.state",
			"o.country as country_name",
			"o.zip_code as zip",
			"o.date_modified"
		]);
		if (count($where)) {
			$this->db->where($where);
		}
		$this->db->orderBy("o.address_id", "DESC");
		$result = $this->db->get();

		//DB::enableQueryLog(); 

		$addresslist = [];
		$addresslist1 = [];
		$addresslist2 = [];
		$i = 0;
		$j = 0;
		$k = 0;
		foreach ($result as $address) {

			if ($shipper_id) {
				if ($product_type == 'ECOM') {

					$addresslist1[$j]['address_id'] = $address->address_id;
					$addresslist1[$j]['customer_id'] = $address->customer_id;
					$addresslist1[$j]['address_name'] = $address->address_name;
					$addresslist1[$j]['name'] = $address->name;
					$addresslist1[$j]['email'] = $address->email;
					$addresslist1[$j]['phone'] = $address->phone;
					$addresslist1[$j]['address'] = $address->address;
					$addresslist1[$j]['address2'] = $address->address2;
					$addresslist1[$j]['city'] = $address->city;
					$addresslist1[$j]['state'] = $address->state;
					$addresslist1[$j]['country_name'] = $address->country_name;
					$addresslist1[$j]['zip'] = $address->zip;
					$addresslist1[$j]['date_modified'] = $address->date_modified;

					$addresslist1[$j]['deliverable'] = 1;


					$j++;
				} else {

					$this->db = DB::table('wh_provider_zipcode as pz');
					$this->db->select(["pz.id", "pz.wh_account_id", "pz.zipcode"]);
					if (count($where)) {
						$this->db->where(['pz.wh_account_id' => $shipper_id, 'pz.zipcode' => $address->zip]);
					}

					$result2 = $this->db->get()->first();
					//var_dump($result2); die;
					//if(isset($result2->id)){  //uncomment this part dilivarable /non delivranle check  .. did this to check event part
					if (1 == 1) {

						$addresslist1[$j]['address_id'] = $address->address_id;
						$addresslist1[$j]['customer_id'] = $address->customer_id;
						$addresslist1[$j]['address_name'] = $address->address_name;
						$addresslist1[$j]['name'] = $address->name;
						$addresslist1[$j]['email'] = $address->email;
						$addresslist1[$j]['phone'] = $address->phone;
						$addresslist1[$j]['address'] = $address->address;
						$addresslist1[$j]['address2'] = $address->address2;
						$addresslist1[$j]['city'] = $address->city;
						$addresslist1[$j]['state'] = $address->state;
						$addresslist1[$j]['country_name'] = $address->country_name;
						$addresslist1[$j]['zip'] = $address->zip;
						$addresslist1[$j]['date_modified'] = $address->date_modified;

						$addresslist1[$j]['deliverable'] = 1;

						//$finalArray = array("deliverable_addresses"=>$addresslist);

						$j++;
					} else {

						$addresslist2[$k]['address_id'] = $address->address_id;
						$addresslist2[$k]['customer_id'] = $address->customer_id;
						$addresslist2[$k]['address_name'] = $address->address_name;
						$addresslist2[$k]['name'] = $address->name;
						$addresslist2[$k]['email'] = $address->email;
						$addresslist2[$k]['phone'] = $address->phone;
						$addresslist2[$k]['address'] = $address->address;
						$addresslist2[$k]['address2'] = $address->address2;
						$addresslist2[$k]['city'] = $address->city;
						$addresslist2[$k]['state'] = $address->state;
						$addresslist2[$k]['country_name'] = $address->country_name;
						$addresslist2[$k]['zip'] = $address->zip;
						$addresslist2[$k]['date_modified'] = $address->date_modified;

						$addresslist2[$k]['deliverable'] = 0; //make it 0 not dilivarable to .. did this to check event part

						//$finalArray[$k] = array("notdeliverable_address"=>$addresslist);
						$k++;
					}
				}
			} else {

				$addresslist[$i]['address_id'] = $address->address_id;
				$addresslist[$i]['customer_id'] = $address->customer_id;
				$addresslist[$i]['address_name'] = $address->address_name;
				$addresslist[$i]['name'] = $address->name;
				$addresslist[$i]['email'] = $address->email;
				$addresslist[$i]['phone'] = $address->phone;
				$addresslist[$i]['address'] = $address->address;
				$addresslist[$i]['address2'] = $address->address2;
				$addresslist[$i]['city'] = $address->city;
				$addresslist[$i]['state'] = $address->state;
				$addresslist[$i]['country_name'] = $address->country_name;
				$addresslist[$i]['zip'] = $address->zip;
				$addresslist[$i]['date_modified'] = $address->date_modified;
			}

			$i++;
		}

		if ($shipper_id) {
			return $finalArray = array("deliverable_addresse" => $addresslist1, "nondeliverable_address" => $addresslist2);
		} else {
			return $addresslist;
		}
	}
	function shipperDetails($where)
	{

		$this->db = DB::table('wh_warehouse_user as u');
		$this->db->select([
			"u.id",
			"u.wh_account_id",
			"u.firstname",
			"u.lastname",
			"u.email",
			"u.telephone",
			"u.androidDeviceToken",
			"u.iosDeviceToken",
			"ua.address_1",
			"ua.address_1",
			"ua.postcode as zip",
			"ua.company",
			"z.city",
			"z.state_name",
			"c.name as county_name"
		]);
		$this->db->join('wh_warehouse_user_address as ua', 'ua.warehouse_user_id', '=', 'u.id');
		$this->db->leftJoin('wh_country as c', 'c.country_id', '=', 'ua.country_id');
		$this->db->leftJoin('wh_zipcode as z', 'z.zip', '=', 'ua.postcode');
		if (count($where)) {
			$this->db->where($where);
		}
		$result = $this->db->get()->first();
		return $result;
	}


	function deleteCustomerAddress($where)
	{
		return DB::table('wh_shipper_order_address')->where($where)->delete();
	}

	function getCoupon($coupon_id)
	{
		$this->db = DB::table('oc_coupon');
		$this->db->select("coupon_id", "name", "type", "discount", "total", "date_start", "date_end", "status");
		$this->db->where(['coupon_id' => $coupon_id]);
		$result = $this->db->get()->first();

		if ($result) {

			return $result;
		} else {
			return (object)[];
		}
	}

	function addCouponDetails($order_data)
	{

		//add info about coupon for current user

		DB::table('oc_coupon_history')
			->insert(
				[
					'coupon_id' => $order_data['coupon_id'],
					'order_id' => $order_data['new_order_id'],
					'customer_id' => $order_data['user_id'],
					'amount' => $order_data['discounted_amount_after_coupon'],
					'date_added' => now(),
				]
			);
	}

	function addOrderMetaData($order_data)
	{
		//echo "<pre>"; print_r($order_data); die;
		//add info about coupon for current user
		if ($order_data['reference'] == 2) {
			$calculated_orderMetaData = $order_data['orderMetaData'];
			//$seller_payout=json_decode($order_data['orderMetaData'])->seller_payout;
			$seller_payout = $order_data['orderMetaData']['seller_payout'];
		} else {
			$calculated_orderMetaData = json_encode($order_data['orderMetaData'], true);
			$seller_payout = $order_data['orderMetaData']['seller_payout'];
		}
		DB::table('ai_order_payment_calculation_data')
			->insert(
				[
					'coupon_id' => $order_data['coupon_id'],
					'order_id' => $order_data['new_order_id'],
					'customer_id' => $order_data['user_id'],
					'amount' => $order_data['discounted_amount_after_coupon'],
					'calculated_orderMetaData' => $calculated_orderMetaData,
					'date_added' => now(),
				]
			);
		$this->db = DB::table('wh_shipper_order');
		$this->db->where(array('id' => $order_data['new_order_id']));
		$this->db->update(['shipper_payout' => $seller_payout]);
	}

	function getOrderMetaData($options)
	{

		//echo "<pre>"; print_r($options); die;

		//getOrderMetaData

		$Order_cost = $options['discounted_price_after_coupon'];
		$ai_category_id = $options['ai_category_id'];
		$order_origin = $options['order_origin'];
		//$order_origin = 'pos';
		//$order_origin = '';

		$shipper_id = $options['shipper_id'];
		$sub_total_amount = $options['sub_total_amount'];
		$discount_amount = $options['discount_amount'];
		$discounted_price = $options['discounted_price'];
		$coupon_discount = $options['coupon_discount'];
		$discounted_price_after_coupon = $options['discounted_price_after_coupon'];

		$meta_type_array['shipper_id'] = $shipper_id;
		$meta_type_array['sub_total_amount'] = $sub_total_amount;
		$meta_type_array['discount_amount'] = $discount_amount;
		$meta_type_array['discounted_price'] = $discounted_price;
		$meta_type_array['coupon_discount'] = $coupon_discount;
		$meta_type_array['discounted_price_after_coupon'] = $discounted_price_after_coupon;
		//$Order_cost,$shipper_id

		$this->db = DB::table('ai_meta');
		$this->db->select("*");
		$this->db->where(['status' => 1, 'meta_type' => 'order']);

		$result = $this->db->get();

		if ($result) {

			foreach ($result as $res) {

				$meta_name = $res->meta_name;
				$meta_type = $res->meta_type;
				$rate_type = $res->rate_type;
				$rate_value = $res->rate_value;
				$unit = $res->unit;

				$meta_type_array[$meta_name] = $rate_value;
			}

			//echo "<pre>"; print_r($meta_type_array);

			if ($meta_type_array['inflation_percent']) {
				$inflation_percent = round($meta_type_array['inflation_percent'], 2);
			} else {
				$inflation_percent = 0;
			}
			if ($meta_type_array['Miles_per_gallon']) {
				$Miles_per_gallon = round($meta_type_array['Miles_per_gallon'], 2);
			} else {
				$Miles_per_gallon = 0;
			}
			if ($meta_type_array['Per_gallon_gas']) {
				$Per_gallon_gas = round($meta_type_array['Per_gallon_gas'], 2);
			} else {
				$Per_gallon_gas = 0;
			}
			if ($meta_type_array['Desired_wage']) {
				$Desired_wage = round($meta_type_array['Desired_wage'], 2);
			} else {
				$Desired_wage = 0;
			}
			if ($meta_type_array['Percent_cut']) {
				$Percent_cut = round($meta_type_array['Percent_cut'], 2);
			} else {
				$Percent_cut = 0;
			}
			if ($meta_type_array['Selling_Fee_Percentage']) {
				$Selling_Fee_Percentage = round($meta_type_array['Selling_Fee_Percentage'], 2);
			} else {
				$Selling_Fee_Percentage = 0;
			}

			if (isset($shipper_id)) {

				$shipperOrderCount = $this->shipperOrderCount(['u.wh_account_id' => $shipper_id]);
				$meta_type_array['shipperOrderCount'] = $shipperOrderCount;
				$Orders_per_hour2 = ($shipperOrderCount / 7) / 24;
				$meta_type_array['Orders_per_hour2'] = $Orders_per_hour2;

				if ($Orders_per_hour2 < 4) {
					$Orders_per_hour = 4;
				} else {
					$Orders_per_hour = $Orders_per_hour2;
				}

				//tax

				$shipperDetails = $this->shipperDetails(['u.wh_account_id' => $shipper_id]);
				if ($shipperDetails) {
					$shipperCity = $shipperDetails->city; //"Monmouth Junction";//
					$shipperzip = $shipperDetails->zip;  //"08852";//
					$shipper_state_name = $shipperDetails->state_name;  //"New Jersey";//
				} else {
					$shipperCity = '';
					$shipperzip = '';
					$shipper_state_name = '';
				}
				//print_r($shipperDetails); die;

				$shipperCountry = "US";

				$TaxRates = json_decode($this->getTaxRates($shipperCity, $shipperCountry, $shipperzip), true);

				if (isset($TaxRates['rate']['combined_rate'])) {
					//echo "<pre>"; print_r($TaxRates);
					//echo "<pre>"; print_r($TaxRates['rate']);
					$Percent_Tax = $TaxRates['rate']['combined_rate'];
				} else {
					$Percent_Tax = 6.625; // per state (taxjar api) 
				}
				//echo $shipper_state_name;
				//echo $ai_category_id; die;
				if ($shipper_state_name == 'New Jersey') {
					if ($ai_category_id == 13) {
						$Percent_Tax = 0.00; //
					}
				}
			} else {
				$shipper_id = "";
				$meta_type_array['shipperOrderCount'] = "";

				$Orders_per_hour = 4;

				//tax

				$Percent_Tax = 6.625; // per state (taxjar api) 

			}



			$meta_type_array['Orders_per_hour'] = $Orders_per_hour;

			$meta_type_array['Percent_Tax'] = round($Percent_Tax, 2);


			$Miles_per_order = 5;   //count this ... //can use avg
			$meta_type_array['Miles_per_order'] = $Miles_per_order;

			$percent_tip = 0;  // will change on app by customer (select)
			$meta_type_array['percent_tip'] = $percent_tip;

			$Gas_price_per_mile = $Per_gallon_gas / $Miles_per_gallon;
			$meta_type_array['Gas_price_per_mile'] = $Gas_price_per_mile;

			$Desired_wage_per_order = $Desired_wage / $Orders_per_hour;
			$meta_type_array['Desired_wage_per_order'] = $Desired_wage_per_order;
			//$Desired_wage_this_order = 6; // avg

			$Avg_gas_cost_per_order =  $Gas_price_per_mile * $Miles_per_order;
			$meta_type_array['Avg_gas_cost_per_order'] = $Avg_gas_cost_per_order;
			//$gas_cost_this_order =  $Gas_price_per_mile * $Miles_per_order;

			$Order_cost = $Order_cost;  //order amount
			$meta_type_array['Order_cost'] = $Order_cost;

			//caclulations 
			//$Inflated_order_cost = ($Order_cost * (1 + $inflation_percent/100) );
			$Inflated_order_cost = $discounted_price_after_coupon;
			$meta_type_array['Inflated_order_cost'] = round($Inflated_order_cost, 2);
			$meta_type_array['discounted_price_after_coupon'] = round($Inflated_order_cost, 2);

			$total_delivery_charge = $Desired_wage_per_order + $Avg_gas_cost_per_order - ($Inflated_order_cost * $percent_tip / 100);

			if ($order_origin == 'pos') {
				$total_delivery_charge = 0.00;
			} else {
				$total_delivery_charge = 0.00;   // this is done beacuse of event .. remove it 
			}

			$meta_type_array['total_delivery_charge'] = round($total_delivery_charge, 2);




			$Customer_Fee = round($total_delivery_charge / 2 + $Inflated_order_cost / (1 + $inflation_percent / 100) * $Percent_cut / 100 + $Inflated_order_cost * $Percent_Tax / 100, 2);

			$meta_type_array['Customer_Fee'] = $Customer_Fee;

			$Seller_Fee =  round(($total_delivery_charge / 2) + ($Order_cost * ($Selling_Fee_Percentage / 100)), 2);
			$meta_type_array['Seller_Fee'] = $Seller_Fee;

			$Driver_Payout = round($total_delivery_charge + $Inflated_order_cost * $percent_tip / 100, 2);
			$meta_type_array['Driver_Payout'] = $Driver_Payout;

			$Driver_Pay_per_Hour =  $Driver_Payout * $Orders_per_hour;
			$meta_type_array['Driver_Pay_per_Hour'] =  $Driver_Pay_per_Hour;

			$Driver_Profit_per_Hour_after_gas  =  round($Driver_Pay_per_Hour - $Avg_gas_cost_per_order *  $Orders_per_hour, 2);
			$meta_type_array['Driver_Profit_per_Hour_after_gas']  =  $Driver_Profit_per_Hour_after_gas;

			$Total_Customer_Cost = round($Customer_Fee + $Inflated_order_cost, 2);
			$meta_type_array['Total_Customer_Cost'] = $Total_Customer_Cost;

			$Total_Seller_Cost = round($Seller_Fee, 2);
			$meta_type_array['Total_Seller_Cost'] = $Total_Seller_Cost;

			$Profit_per_order =  round(($Percent_cut + $inflation_percent) / 100 *  $Order_cost + $Order_cost * $Selling_Fee_Percentage / 100, 2);
			$meta_type_array['Profit_per_order'] =  $Profit_per_order;


			$seller_payout = round($Order_cost - $Total_Seller_Cost, 2);
			$meta_type_array['seller_payout'] =  $seller_payout;

			$customer_price = round($Inflated_order_cost, 2);
			$meta_type_array['customer_price'] = $customer_price;

			$delivery_fee = round($total_delivery_charge / 2, 2);
			$meta_type_array['delivery_fee'] = $delivery_fee;

			$Platform_Fee = round($Inflated_order_cost / (1 + $inflation_percent / 100) * ($Percent_cut / 100), 2);

			if ($order_origin == "pos") {
				$Platform_Fee = 0.00;
			}

			$meta_type_array['Platform_Fee'] = $Platform_Fee;

			$tax = round($Inflated_order_cost * $Percent_Tax / 100, 2);
			$meta_type_array['tax'] = $tax;

			$total = round($customer_price + $delivery_fee + $Platform_Fee + $tax, 2);
			$meta_type_array['total']  = $total;
			return $meta_type_array;
		} else {
			return (object)[];
		}
	}

	function shipperOrderCount($shipper_id)
	{

		$this->db = DB::table('wh_shipper_order as o');
		$this->db->select([
			"o.id"
		]);
		//$this->db->join('wh_warehouse_user_address as ua', 'ua.warehouse_user_id', '=', 'u.id');

		$this->db->where(["o.shipper_id" => $shipper_id]);

		$this->db->whereRaw('DATE(o.order_date) = DATE_SUB(CURDATE(), INTERVAL 7 DAY)');

		$result = $this->db->get();
		return count($result);
	}
	function shippertotalpayout($shipper_id)
	{

		$this->db = DB::table('wh_shipper_order as o');
		$this->db->select(DB::raw('sum(o.shipper_payout) as shipper_payout'));
		$this->db->join('wh_warehouse_user as wu', 'wu.wh_account_id', '=', 'o.shipper_id');

		$this->db->where(["o.shipper_id" => $shipper_id]);

		$this->db->groupBy("o.shipper_id");
		$result = $this->db->get();
		return $result;
	}



	function getTaxRates($city, $country, $zip)
	{
		//taxjar api to get state rate  tax
		$city = str_replace(" ", "%20", $city);

		$curl = curl_init();

		curl_setopt_array($curl, array(
			CURLOPT_URL => 'https://api.taxjar.com/v2/rates/' . $zip . '?country=' . $country . '&city=' . $city,
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_ENCODING => '',
			CURLOPT_MAXREDIRS => 10,
			CURLOPT_TIMEOUT => 0,
			CURLOPT_FOLLOWLOCATION => true,
			CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
			CURLOPT_CUSTOMREQUEST => 'GET',
			CURLOPT_HTTPHEADER => array(
				'Authorization: Bearer b33ab1234a1d666661de9f7279d9b439'
			),
		));

		$response = curl_exec($curl);

		curl_close($curl);
		return $response;
	}

	function getCartDetails($user_id)
	{

		$response = $this->cartList(['c.user_id' => $user_id]);

		$response_data = [];
		if (count($response)) {
			//enable this after order
			$sub_discounted_price = 0;
			$sub_total_amount = 0;

			foreach ($response as $row) {

				$getProductPrice = $this->getProductPrice($row->price, $row->discount);

				$product_price = $getProductPrice['product_price'];
				$discounted_price = $getProductPrice['discounted_price'];

				$response_data[] = array(
					'cart_id' => $row->cart_id,
					'id' => $row->id,
					'product_id' => $row->product_id,
					'quantity' => $row->quantity,
					'price' => $product_price,
					'shipper_id' => $row->shipper_id,
					'discount' => $row->discount,
					'ai_category_id' => $row->ai_category_id,
					'discounted_price' => $discounted_price
				);

				$sub_discounted_price += (float) $discounted_price * (int) $row->quantity;
				$sub_total_amount += (float) $product_price * (int) $row->quantity;
				//$discount_amount += $sub_total_amount * (int) $row->quantity;

				$shipper_id = $row->shipper_id;

				if ($row->ai_category_id == 13) { // check for cothing category to set tax zero for NJ)
					$ai_category_id = $row->ai_category_id;
				}
			}

			if (isset($ai_category_id)) {
				$ai_category_id = $ai_category_id;
			} else {
				$ai_category_id = "";
			}

			$cart_total['ai_category_id'] = $ai_category_id;
			$cart_total['discounted_price'] = $sub_discounted_price;
			$cart_total['sub_total_amount'] = $sub_total_amount;
			$cart_total['discount_amount'] = $sub_total_amount - $sub_discounted_price;
			$cart_total['shipper_id'] = $shipper_id;

			//echo $sub_discounted_price; die;
			//$getOrderMetaData=$this->getOrderMetaData($sub_discounted_price,$shipper_id); 

			$result = $cart_total;
			//$result= array("cartlist"=>$response_data, 'cart_total'=>$cart_total);

		} else {
			$result = "";
		}



		return $result;
	}

	public function posMoveCart($data)
	{
		$this->db = DB::table('ai_cart');
		$this->db->where(array('user_id' => $data['user_id']));
		$this->db->update(['user_id' => $data['new_user_id']]);
	}
	public function getProductPrice($actual_price, $discount)
	{

		$this->db = DB::table('ai_meta');
		$this->db->select("*");
		$this->db->where(['status' => 1, 'meta_name' => 'inflation_percent']);

		$result = $this->db->get()->first();
		$response = array();
		if ($result) {
			if ($result->meta_name == "inflation_percent") {


				$response['product_price'] = round(($actual_price) * (1 + ($result->rate_value) / 100), 2);
				$response['discounted_price'] = round($response['product_price'] - (($response['product_price']) * ($discount / 100)), 2);
			} else {
				$response['product_price'] = $actual_price;
				$response['discounted_price'] = $actual_price;
			}

			return $response;
		}
	}

	public function updateTokenQry($data)
	{
		if ($data['androidDeviceToken'] != "") {

			$this->db = DB::table('ai_users');
			$this->db->where(array('id' => $data['user_id']));
			$this->db->update(['androidDeviceToken' => $data['androidDeviceToken']]);
		}

		if ($data['iosDeviceToken'] != "") {

			$this->db = DB::table('ai_users');
			$this->db->where(array('id' => $data['user_id']));
			$this->db->update(['iosDeviceToken' => $data['iosDeviceToken']]);
		}

		return true;
	}



	function reorderProduct($request_data, $user_id, $shipper_id)
	{
		if (count($request_data)) {
			$status = true;
			foreach ($request_data as $request_row) {
				$this->db = DB::table('ai_product as p');
				$this->db->select(["p.ai_product_id", DB::raw("(wp.quantity-ifnull(wp.ordered_qty,0)) as total_product_quantity")]);
				$this->db->join('wh_producttoshipper as wp', 'wp.ai_product_id', '=', 'p.ai_product_id');
				$this->db->where(['wp.id' => $request_row['product_id']]);
				$result = $this->db->get()->first();
				if (!is_array($result) || count($result) === 0) {
					$this->db = DB::table('oc_product as p');
					$this->db->select(["p.product_id as ai_product_id", DB::raw("(wp.quantity-ifnull(wp.ordered_qty,0)) as total_product_quantity")]);
					$this->db->join('wh_producttoshipper as wp', 'wp.ai_product_id', '=', 'p.product_id');
					$this->db->where(['wp.id' => $request_row['product_id']]);
					$this->db->where(['wp.product_type' => 'ECOM']);
					$result = $this->db->get()->first();
				}
				if ($result->total_product_quantity < $request_row['quantity']) {
					$status = false;
				}
			}
			if ($status) {
				$this->db = DB::table('ai_cart');
				$this->db->select(["cart_id", "shipper_id"]);
				$this->db->where(['user_id' => $user_id]);
				$result = $this->db->get()->first();
				if (!$result) {
					DB::table('ai_cart')
						->insert(['user_id' => $user_id, 'shipper_id' => $shipper_id]);
					$cart_id = DB::getPdo()->lastInsertId();
					foreach ($request_data as $request_row) {
						DB::table('ai_cart_details')
							->insert(['product_id' => $request_row['product_id'], 'quantity' => $request_row['quantity'], 'cart_id' => $cart_id]);
					}
					return ['status' => 1, 'code' => 200, 'data' => (object)[], 'message' => 'Product Successfully added in cart!'];
				} else {
					if ($result->shipper_id == $shipper_id) {
						foreach ($request_data as $request_row) {
							$this->db = DB::table('ai_cart_details');
							$this->db->select(["product_id", "quantity", "cart_id"]);
							$this->db->where(array('product_id' => $request_row['product_id'], 'cart_id' => $result->cart_id));
							$cart_details = $this->db->get()->first();
							if ($cart_details) {
								$this->db = DB::table('ai_cart_details');
								$this->db->where(array('product_id' => $request_row['product_id'], 'cart_id' => $result->cart_id));
								$this->db->update(['quantity' => $request_row['quantity']]);
							} else {
								DB::table('ai_cart_details')
									->insert(['product_id' => $request_row['product_id'], 'quantity' => $request_row['quantity'], 'cart_id' => $result->cart_id]);
							}
						}
						return ['status' => 1, 'code' => 200, 'data' => (object)[], 'message' => 'Product Successfully moved into cart!'];
					} else {
						return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'Sorry, some items are not available at your new location.'];
					}
				}
			} else {
				return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'Product Quantity issue!'];
			}
		} else {
			return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'Request is missing'];
		}
	}

	function posManageSales($data, $custom_date = [])
	{
		$where = array();
		if ($data['order_created_type'] == 1) {
			$where['so.order_created_by_type'] = $data['order_created_type'];
			$where['so.order_created_by_id'] = $data['shipper_id'];
		}
		if ($data['order_created_type'] == 2) {
			$where['so.order_created_by_type'] = $data['order_created_type'];
			$where['so.order_created_by_id'] = $data['order_created_id'];
		}
		if ($data['shipper_id'] > 0) {
			$where['so.shipper_id'] = $data['shipper_id'];
		}
		$this->db = DB::table('wh_shipper_order AS so');
		$this->db->select([
			"so.id",
			"so.invoice_no",
			"so.order_created_by_type",
			"so.order_created_by_id",
			"so.order_amount",
			"so.order_reference",
			"so.total_product",
			"so.name as customer_name",
			\DB::raw("DATE_FORMAT(so.order_date, '%m/%d/%Y %H:%i') as order_date")

		]);
		if (count($where) > 0) {
			$this->db->where($where);
		}
		if (count($custom_date)) {
			$this->db->whereDate("so.order_date", ' >=', date('Y-m-d', strtotime($custom_date['from_date'])));
			$this->db->whereDate("so.order_date", '<=', date('Y-m-d', strtotime($custom_date['to_date'])));
		}
		if ($data['search'] != '') {
			// $this->db->where('c.firstname', 'like','%'.$data['search'].'%');
			// $this->db->orwhere('c.lastname', 'like','%'.$data['search'].'%');
			// $this->db->orwhere('o.email', 'like','%'.$data['search'].'%');
		}
		if ($data['order'] != '') {
			$order_by = '';
			switch ($data['order']) {

				case '1':
					$order_by = 'so.id';
					break;
				case '2':
					$order_by = 'so.order_reference';
					break;
				case '3':
					$order_by = 'so.order_date';
					break;
				case '4':
					$order_by = 'so.invoice_no';
					break;
				case '5':
					$order_by = 'so.order_amount';
					break;
				case '6':
					$order_by = 'so.total_product';
					break;
				case '7':
					$order_by = 'so.name';
					break;

				default:
					$order_by = 'so.id';
					break;
			}
			$dir_by = '';
			switch ($data['dir']) {

				case 'asc':
					$dir_by = 'asc';
					break;
				case 'desc':
					$dir_by = 'desc';
					break;
				default:
					$dir_by = 'asc';
					break;
			}
		} else {
			$order_by = 'so.id';
			$dir_by = 'asc';
		}
		$this->db->orderBy($order_by, $dir_by);

		if ($data['count']) {
			$productData = $this->db->get();
			return  count($productData);
		} else {
			if ($data['start'] < 0 || !isset($data['start'])) {
				$data['start'] = 0;
			}
			if ($data['length'] < 0 || !isset($data['length'])) {
				$data['length'] = 20;
			}
			$this->db->offset($data['start']);
			$this->db->limit($data['length']);
			$productData = $this->db->get();
			return $productData;
		}
	}

	function posManageAgents($data)
	{
		$where = array();
		if ($data['shipper_id'] > 0) {
			$where['aa.shipper_id'] = $data['shipper_id'];
		}
		$this->db = DB::table('ai_agents AS aa');
		$this->db->select([
			"aa.id",
			"aa.shipper_id",
			"aa.name",
			"aa.phone",
			"aa.email",
			"aa.status",
			\DB::raw("DATE_FORMAT(aa.added_date, '%m/%d/%Y %H:%i') as order_date")

		]);
		if (count($where) > 0) {
			$this->db->where($where);
		}
		if ($data['search'] != '') {
			// $this->db->where('c.firstname', 'like','%'.$data['search'].'%');
			// $this->db->orwhere('c.lastname', 'like','%'.$data['search'].'%');
			// $this->db->orwhere('o.email', 'like','%'.$data['search'].'%');
		}
		if ($data['order'] != '') {
			$order_by = '';
			switch ($data['order']) {

				case 0:
					$order_by = 'aa.id';
					break;
				case 1:
					$order_by = 'aa.name';
					break;
				case 2:
					$order_by = 'aa.phone';
					break;
				case 3:
					$order_by = 'aa.email';
					break;
				case 4:
					$order_by = 'aa.status';
					break;
				default:
					$order_by = 'aa.id';
					break;
			}
			$dir_by = '';
			switch ($data['dir']) {

				case 'asc':
					$dir_by = 'asc';
					break;
				case 'desc':
					$dir_by = 'desc';
					break;
				default:
					$dir_by = 'asc';
					break;
			}
		} else {
			$order_by = 'aa.id';
			$dir_by = 'asc';
		}
		$this->db->orderBy($order_by, $dir_by);

		if ($data['count']) {
			$agentsData = $this->db->get();
			return  count($agentsData);
		} else {
			if ($data['start'] < 0 || !isset($data['start'])) {
				$data['start'] = 0;
			}
			if ($data['length'] < 0 || !isset($data['length'])) {
				$data['length'] = 20;
			}
			$this->db->offset($data['start']);
			$this->db->limit($data['length']);
			$agentsData = $this->db->get();
			return $agentsData;
		}
	}

	function getSales($where = [], $custom_date = [])
	{
		$this->db = DB::table('wh_shipper_order as so');
		$this->db->select([
			DB::raw('IFNULL(sum(so.order_amount),0.00) as total_sales')
		]);
		if (count($where)) {
			$this->db->where($where);
		}
		if (count($custom_date)) {
			$this->db->whereDate("so.order_date", ' >=', date('Y-m-d', strtotime($custom_date['from_date'])));
			$this->db->whereDate("so.order_date", '<=', date('Y-m-d', strtotime($custom_date['to_date'])));
		}
		$result = $this->db->get()->first();
		return $result;
	}

	public function getWarehouseDetails($where)
	{
		if (count($where) > 0) {
			$this->db = DB::table('wh_warehouse_user as u');
			$this->db->select(["u.wh_account_id", "ua.company as store_name", "ua.company_icon as store_icon", "company_type as store_type", "ua.address_1", "ua.city", "ua.postcode as zipcode", DB::raw("'' as timetaking"),  DB::raw("'' as distance")]);
			$this->db->join('wh_warehouse_user_address as ua', 'u.id', '=', 'ua.warehouse_user_id');
			$this->db->where($where);
			$result = $this->db->get()->first();
			return $result;
		}
		return false;
	}

	public function getStoreTypeData($where)
	{
		if (count($where) > 0) {
			$this->db = DB::table('ai_store_types as st');
			$this->db->select(["st.id", "st.code", "st.name"]);
			$this->db->where($where);
			$result = $this->db->get()->first();
			return $result;
		}
		return false;
	}



	public function getCreditCardTransactionDetails($where)
	{
		if (count($where) > 0) {
			$this->db = DB::table('ai_pos_order_webhook as pow');
			$this->db->select(
				[
					"pow.id",
					"pow.webhook_type",
					"pow.transaction_id",
					"pow.wh_user_Email",
					"pow.event_type",
					"pow.amount",
					"pow.amount_captured",
					"pow.jsonDetails",
					"pow.webhooktime",
					"pow.payment_status",
					"pow.order_status",
					"pow.currenttime",
				]
			);
			$this->db->where($where);
			$this->db->orderBy("pow.id", "DESC");
			$result = $this->db->get()->first();
			return $result;
		}
		return false;
	}

	public function updateCreditCardPaymentStatus($data)
	{
		$this->db = DB::table('ai_pos_order_webhook');
		$this->db->where(array('id' => $data['id']));
		$result = $this->db->update(['order_status' => $data['order_status']]);
		return $result;
	}

	public function posAddUpdateAgent($data)
	{
		$this->db = DB::table('ai_agents as aa');
		$this->db->select([
			"aa.id",
		]);
		$this->db->where(['aa.email' => $data['email']]);
		if (!empty($data['id'])) {
			$this->db->whereNotIn('aa.id', [$data['id']]);
		}
		$result = $this->db->get()->first();
		if ($result) {
			return ['status' => 0, 'code' => 402, 'message' => 'Associate email address already exists!'];
		} else {
			$this->db->select([
				"aa.id",
			]);
			$this->db->where(['aa.phone' => $data['phone']]);
			if (!empty($data['id'])) {
				$this->db->whereNotIn('aa.id', [$data['id']]);
			}
			$result = $this->db->get()->first();
			if ($result) {
				return ['status' => 0, 'code' => 402, 'message' => 'Associate phone number already exists!'];
			} else {
				if (!empty($data['id'])) {
					$this->db = DB::table('ai_agents');
					$this->db->where(array('id' => $data['id'], 'shipper_id' => $data['shipper_id']));
					$this->db->update(['name' => $data['name'], 'email' => $data['email'], 'phone' => $data['phone'], 'password' => $data['password'], 'status' => $data['status']]);
					$agent_id = $data['id'];
				} else {
					$result = DB::table('ai_agents')
						->insert(
							[
								'shipper_id' => $data['shipper_id'],
								'name' => $data['name'],
								'email' => $data['email'],
								'phone' => $data['phone'],
								'password' => $data['password'],
								'provider_id' => $data['provider_id'],
								'status' => $data['status'],
							]
						);
					$agent_id = DB::getPdo()->lastInsertId();
				}
				DB::table('ai_agent_permission_mapping')->where(['agent_id' => $agent_id])->delete();
				$permission_arr = json_decode($data['agent_permissions']);
				if ($permission_arr) {
					if (count($permission_arr)) {
						foreach ($permission_arr as $permission_arr) {
							DB::table('ai_agent_permission_mapping')
								->insert(
									[
										'agent_id' => $agent_id,
										'permission_id' => $permission_arr,
									]
								);
						}
					}
				}
				if ($agent_id > 0) {
					if (empty($data['id'])) {
						return ['status' => 1, 'code' => 200, 'message' => 'Associate successfully added'];
					} else {
						return ['status' => 1, 'code' => 200, 'message' => 'Associate successfully updated'];
					}
				} else {
					return ['status' => 0, 'code' => 402, 'message' => 'Something went wrong!'];
				}
			}
		}
	}

	public function posAgentLogin($data)
	{
		if (count($data)) {
			$this->db = DB::table('ai_agents as aa');
			$this->db->select([
				"aa.id",
				"aa.shipper_id",
				"aa.name as firstname",
				"aa.phone",
				"aa.email",
				"aa.password",
				"aa.status",
				"wu.wh_account_id",
				"aa.provider_id"
			]);
			$this->db->join('wh_warehouse_user as wu', 'wu.wh_account_id', '=', 'aa.shipper_id');
			$this->db->where($data);
			$response = $this->db->get()->first();
			if ($response) {
				if ($response->status) {
					$response->lastname = '';
					$user = new User();
					$user_details = $user->getShipperDetails(['wh_account_id' => $response->shipper_id]);
					return ['status' => 1, 'code' => 200, 'data' => $response, 'user_details' => $user_details, 'message' => 'Login successfully'];
				} else {
					return ['status' => 0, 'code' => 402, 'data' => $response, 'message' => 'Your account needs to approved by admin!'];
				}
			} else {
				return ['status' => 0, 'code' => 402, 'data' => $response, 'message' => 'Received invalid credentials'];
			}
		}
		return [];
	}


	public function posAgentList($data)
	{
		if (count($data)) {
			$this->db = DB::table('ai_agents as aa');
			$this->db->select([
				"aa.id",
				"aa.shipper_id",
				"aa.name as firstname",
				"aa.phone",
				"aa.email",
				"aa.password",
				"aa.status",
				"aa.provider_id",
				"wu.wh_account_id"
			]);
			$this->db->join('wh_warehouse_user as wu', 'wu.wh_account_id', '=', 'aa.shipper_id');
			$this->db->where($data);
			$this->db->orderBy('aa.name');
			$response = $this->db->get();
			if ($response) {
				return ['status' => 1, 'code' => 200, 'data' => $response, 'message' => 'success'];
			} else {
				return ['status' => 0, 'code' => 402, 'data' => $response, 'message' => 'Associate Not found'];
			}
		}
		return [];
	}

	public function posAgentPermissions($where)
	{
		$this->db = DB::table('ai_permissions as p');
		$this->db->select(["p.id", "p.name", "p.status"]);
		if (count($where) > 0) {
			$this->db->where($where);
		}
		$response = $this->db->get();
		if ($response) {
			return ['status' => 1, 'code' => 200, 'data' => $response, 'message' => 'success'];
		} else {
			return ['status' => 0, 'code' => 402, 'data' => $response, 'message' => 'Permissions Not found'];
		}
	}

	public function posGetAgentDetails($data)
	{
		if (count($data)) {
			$this->db = DB::table('ai_agents as aa');
			$this->db->select([
				"aa.id",
				"aa.shipper_id",
				"aa.name as firstname",
				"aa.phone",
				"aa.email",
				"aa.password",
				"aa.status",
				"wu.wh_account_id"
			]);
			$this->db->join('wh_warehouse_user as wu', 'wu.wh_account_id', '=', 'aa.shipper_id');
			$this->db->where($data);
			$this->db->orderBy('aa.name');
			$response = $this->db->get()->first();
			$permission = [];
			if ($response) {
				$permission = $this->posGetAgentAppliedPermissions(['apm.agent_id' => $data['aa.id']]);
				return ['status' => 1, 'code' => 200, 'data' => $response, 'permission' => $permission, 'message' => 'Success'];
			} else {
				return ['status' => 0, 'code' => 402, 'data' => $response, 'permission' => $permission, 'message' => 'associate Not found'];
			}
		}
		return [];
	}

	public function posGetAgentAppliedPermissions($where)
	{
		$this->db = DB::table('ai_agent_permission_mapping as apm');
		$this->db->select(["p.id", "p.name", "p.status"]);
		$this->db->join('ai_permissions as p', 'p.id', '=', 'apm.permission_id');
		if (count($where) > 0) {
			$this->db->where($where);
		}
		return $this->db->get();
	}

	public function posChangeAssociateStatus($data)
	{
		if (count($data)) {
			$this->db = DB::table('ai_agents as aa');
			$this->db->select([
				"aa.id",
				"aa.status",
			]);
			$this->db->where(['aa.id' => $data['id']]);
			$result = $this->db->get()->first();
			if ($result) {
				if ($result->status == 1) {
					$set_status = 0;
				} else {
					$set_status = 1;
				}
				$this->db = DB::table('ai_agents');
				$this->db->where(array('id' => $data['id']));
				$this->db->update(['status' => $set_status]);
				return ['status' => 1, 'code' => 200, 'data' => [], 'message' => 'status updated successfully!'];
			} else {
				return ['status' => 0, 'code' => 402, 'data' => [], 'message' => 'associate Not found'];
			}
		}
	}
	public function posGetOrderCreatedByName($data)
	{
		if ($data['order_created_by_type'] == 2) {
			$this->db = DB::table('ai_agents as aa');
			$this->db->select([
				"aa.id",
				"aa.name as firstname",
			]);
			$this->db->where(['aa.id' => $data['order_created_by_id']]);
			$result = $this->db->get()->first();
			return $result->firstname . ' (Associate)';
		}
		if ($data['order_created_by_type'] == 1) {
			$this->db = DB::table('wh_warehouse_user as u');
			$this->db->select(["u.firstname", "u.lastname"]);
			$this->db->where(['u.wh_account_id' => $data['order_created_by_id']]);
			$result = $this->db->get()->first();
			return $result->firstname . ' ' . $result->lastname . ' (Admin)';
		}
	}

	public function updateOrder($data)
	{
		$this->db = DB::table('wh_shipper_order as so');
		$this->db->select(["so.id"]);
		$this->db->where(['so.customer_id' => $data['customer_id'], 'so.id' => $data['order_id']]);
		$result = $this->db->get()->first();
		if ($result) {
			$this->db = DB::table('wh_shipper_order');
			$this->db->where(array('id' => $data['order_id'], 'customer_id' => $data['customer_id']));
			$this->db->update(['payment_id' => $data['payment_id'], 'payment_status' => $data['payment_status']]);
			return ['status' => 1, 'order_id' => $data['order_id'], 'payment_status' => 1, 'message' => 'Yay! Your order is being processed'];
		} else {
			return ['status' => 0, 'order_id' => $data['order_id'], 'payment_status' => 0, 'message' => 'something went wrong!'];
		}
	}




	function bookingsList($where, $options)
	{

		//	$status_type = $options['status_type'];
		//$search_string = $options['search_string'];
		$limit1 = $options['limit1'];
		$limit2 = $options['limit2'];


		//DB::enableQueryLog(); 
		$this->db = DB::table('wh_store_appointments as wa');
		$this->db->select([
			"wa.id",
			"wa.wh_account_id",
			"wa.ai_user_id",
			"wa.store_provider_id",
			"ps.provider_name as store_provider_name",
			"ps.provider_image as store_provider_image",
			"wua.company as store_name",
			"wua.address_1 as store_address1",
			"wua.address_2 as store_address2",
			"wua.city as store_city",
			"wua.postcode as store_zipcode",
			"z.state_name as store_state",
			"wa.product_id",
			"wa.customer_name",
			"wa.customer_email",
			"wa.customer_phone",
			"wa.customer_billing_address",
			"wa.selected_date",
			"wa.selected_time",
			"wa.service_interval",
			"wa.amount",
			"wa.comments",
			"wp.title",
			"wp.image",
			"o.id as order_id",
			"wa.created_date"
		]);
		$this->db->join('wh_producttoshipper as wp', 'wp.id', '=', 'wa.product_id');
		$this->db->join('wh_provider_services as ps', 'ps.id', '=', 'wa.store_provider_id');
		$this->db->join('wh_warehouse_user as wu', 'wu.wh_account_id', '=', 'wa.wh_account_id');
		$this->db->join('wh_warehouse_user_address as wua', 'wua.warehouse_user_id', '=', 'wu.id');
		$this->db->leftjoin('wh_shipper_order as o', 'o.booking_id', '=', 'wa.id');
		$this->db->leftjoin('wh_zipcode as z', 'z.id', '=', 'wa.id');

		//	$this->db->join('wh_shipper_order_product as op', 'op.order_id','=','o.id'); 
		//	$this->db->leftjoin('ai_order_payment_calculation_data as opcd', 'opcd.order_id','=','o.id'); 
		//$this->db->leftjoin('wh_shipper_order_driver_status as sods', 'sods.order_id','=','o.id'); 
		//$this->db->join('oc_coupon_history as ch', 'ch.order_id','=','o.id'); 
		//	$this->db->join('wh_producttoshipper as wp', 'wp.id','=','op.product_id'); 
		//	$this->db->leftjoin('ai_product as p', 'op.ai_product_id', '=', 'p.ai_product_id');

		if (count($where)) {
			//echo "<pre>"; print_r($where);
			$this->db->where($where);
		}

		//if($search_string){
		//echo "<pre>"; print_r($search_string);
		//$this->db->Where(function($query) use ($search_string)  { });	
		//}

		$this->db->orderBy("wa.id", "DESC");
		$this->db->offset($limit1);
		$this->db->limit($limit2);
		$result = $this->db->get();
		return $result;
	}


	function bookingsListTotal($where)
	{

		//	$status_type = $options['status_type'];
		//$search_string = $options['search_string'];



		//DB::enableQueryLog(); 
		$this->db = DB::table('wh_store_appointments as wa');
		$this->db->select([
			"wa.id",
			"wa.wh_account_id",
			"wa.ai_user_id",
			"wa.store_provider_id",
			"wa.product_id",
			"wa.customer_name",
			"wa.selected_date",
			"wa.selected_time",
			"wa.amount",
			"wa.comments",
			"wa.created_date",
		]);

		//	$this->db->join('wh_shipper_order_product as op', 'op.order_id','=','o.id'); 
		//	$this->db->leftjoin('ai_order_payment_calculation_data as opcd', 'opcd.order_id','=','o.id'); 
		//$this->db->leftjoin('wh_shipper_order_driver_status as sods', 'sods.order_id','=','o.id'); 
		//$this->db->join('oc_coupon_history as ch', 'ch.order_id','=','o.id'); 
		//	$this->db->join('wh_producttoshipper as wp', 'wp.id','=','op.product_id'); 
		//	$this->db->leftjoin('ai_product as p', 'op.ai_product_id', '=', 'p.ai_product_id');

		if (count($where)) {
			//echo "<pre>"; print_r($where);
			$this->db->where($where);
		}

		//if($search_string){
		//echo "<pre>"; print_r($search_string);
		//$this->db->Where(function($query) use ($search_string)  { });	
		//}

		$this->db->orderBy("wa.id", "DESC");
		$result = count($this->db->get());
		return $result;
	}



	function getShipperOrdersDetails($where)
	{
		$this->db = DB::table('wh_shipper_order as o');
		$this->db->select([
			"o.id as order_id",
			"o.customer_id",
			"o.shipper_id",
			"o.name",
			"o.invoice_no",
			"o.phone",
			"o.country",
			"o.city",
			"o.state",
			"o.email",
			"o.total_amount",
			"o.address",
			"o.address_name",
			"o.order_reference",
			"o.zip_code",
			"o.id",
			"o.order_date",
			"o.payment_method",
			"o.payment_status",
			"o.total_product",
			"o.payment_id",
			"o.delivered",
			"o.delivered_image",
			"o.delivered_sign",
			"o.visible_drunk",
			"o.package_received_by",
			"o.driver_note",
			"o.delivered_time",

			"o.Shipped",
			"o.Shipped_time",
			"o.packed",
			"o.packed_time",
			"o.accepted",
			"o.accepted_time",
			"o.cancelled",
			"o.cancelled_time",
			"o.refunded",
			"o.refunded_time",
			"o.store_rating",
			"o.delivery_rating",
			"o.customer_message",
			"o.shipper_company_name",
			"o.shipper_name",
			"o.shipper_phone",
			"o.shipper_email",
			"o.shipper_address",
			"o.shipper_city",
			"o.shipper_state",
			"o.shipper_country",
			"o.shipper_zipcode",
			"o.discounted_amount_after_coupon",
			"o.coupon_id",
			"opcd.calculated_orderMetaData",
			"o.order_created_by_type",
			"o.delivery_type",
			"sods.driver_id",
			"sods.accepted as driver_accepted",
			"sods.accepted_datetime",
			"sods.to_be_delivered_on",
			"sods.go_to_pickup",
			"sods.go_to_pickup_date_time",
			"sods.confirm_pickup",
			"sods.confirm_pickup_datetime",
			"sods.reached_at_store",
			"sods.reached_at_store_date_time",
			"sods.on_the_way_to_the_customer",
			"sods.on_the_way_to_the_customer_date_time",
			"sods.reached_at_customer",
			"sods.reached_at_customer_date_time",
			"sods.delivered as driver_delivered",
			"sods.delivered_datetime",
			"sods.driver_note",
			"sods.visible_drunk",
			"sods.package_received_by",
			"sods.delivery_proof_file_name",
			"sods.delivery_proof_file_path",
			"sods.customer_signature_file_name",
			"sods.customer_signature_file_path",
			"sods.confirm_pickup_by_driver",
			"sods.confirm_pickup_driver_datetime",
			"wu.firstname",
			"wu.lastname",
			"wu.profile_img",
			"ua.company as store_name",
			"ua.company_icon",
			"sotd.time",
			"sotd.distance",
			"sotd.pickup_lat",
			"sotd.pickup_long",
			"sotd.drop_lat",
			"sotd.drop_long",

			"sods.driver_id",
			"dwu.id",
			"dwu.firstname as driver_firstname",
			"dwu.lastname as driver_lastname",
			"dwu.email as driver_email",
			"dwu.telephone as driver_phone",
			"dwu.driver_status",
			"dua.address_1 as driver_address",
			"dua.postcode as driver_addresszip",
			"dua.company_icon as driver_company",
			"dwu.profile_img as driver_profileimg",

		]);
		$this->db->join('wh_shipper_order_product as op', 'op.order_id', '=', 'o.id');
		$this->db->join('wh_producttoshipper as wp', 'wp.id', '=', 'op.product_id');
		$this->db->leftJoin('wh_shipper_order_time_distance AS sotd', 'sotd.order_id', '=', 'o.id');
		$this->db->leftJoin('wh_warehouse_user AS wu', 'o.shipper_id', '=', 'wu.wh_account_id');
		$this->db->leftJoin('wh_warehouse_user_address as ua', 'ua.warehouse_user_id', '=', 'wu.id');
		$this->db->leftjoin('ai_order_payment_calculation_data as opcd', 'opcd.order_id', '=', 'o.id');
		//$this->db->leftjoin('wh_shipper_order_driver as sod', 'sod.order_id','=','o.id'); 
		$this->db->leftjoin('wh_shipper_order_driver_status as sods', 'sods.order_id', '=', 'o.id');
		$this->db->leftJoin('wh_warehouse_user AS dwu', 'sods.driver_id', '=', 'dwu.id');
		$this->db->leftJoin('wh_warehouse_user_address as dua', 'dua.warehouse_user_id', '=', 'dwu.id');

		$this->db->leftjoin('ai_product as p', 'op.ai_product_id', '=', 'p.ai_product_id');

		if (count($where)) {
			$this->db->where($where);
		}
		$this->db->groupBy("o.id");
		$this->db->orderBy("o.id", "DESC");
		return $this->db->get()->first();
	}

	function changeDeliveryType($where, $data)
	{

		$this->db = DB::table('wh_shipper_order');
		$this->db->where($where);
		$this->db->update(['delivery_type' => $data['delivery_type']]);
	}


	public function changeDriverOrderStatus($data)
	{
		$this->db = DB::table('wh_shipper_order AS so');
		$this->db->select([
			"so.id",
			"sotd.time",
			"sotd.distance",
		]);
		$this->db->leftJoin('wh_shipper_order_time_distance AS sotd', 'sotd.order_id', '=', 'so.id');
		if (count($data)) {
			$this->db->where(['so.id' => $data['order_id']]);
		}
		$order_details = $this->db->get()->first();
		if ($order_details) {

			if ($data['status'] == 7) {
				//delevered
				$result = $this->getDriverOrderStatusData(array('order_id' => $data['order_id'], 'driver_id' => $data['driver_id']));
				if ($result) {

					if ($result->delivered) {
						return ['status' => 0, 'code' => 402, 'data' => $result, 'message' => 'Order already delivered'];
					} else {
						$distance = $order_details->distance;
						$actual_distance = explode(' ', $distance);
						DB::table('wh_shipper_order_driver_status')
							->where(array('id' => $result->id))
							->update(
								[
									'delivered' => 1,
									'delivered_datetime' => now(),
									'delivery_proof_file_name' => $data['delivery_proof_file_name'],
									'delivery_proof_file_path' => $data['delivery_proof_file_path'],
									'customer_signature_file_name' => $data['customer_signature_file_name'],
									'customer_signature_file_path' => $data['customer_signature_file_path'],
									'visible_drunk' => $data['visible_drunk'],
									'package_received_by' => $data['package_received_by'],
									'driver_note' => $data['driver_note'],
									'delivered_distance' => $actual_distance[0],
								]
							);
						return ['status' => 1, 'code' => 200, 'visible' => true, 'message' => 'Order mark as delivered successfully'];
					}
				}
			}

			if ($data['status'])
				if (!in_array($data['status'], array(0, 1, 2, 3, 4, 5, 6, 7, 8))) {
					return ['status' => 0, 'code' => 402, 'data' => (object)[], 'message' => 'invalid status'];
				}
		} else {
			return ['status' => 0, 'code' => 402, 'message' => 'Invalid Order'];
		}
	}
}
