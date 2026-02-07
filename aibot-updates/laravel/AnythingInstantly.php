<?php

namespace App\Http\Controllers;
use Illuminate\Http\Request;
use App\Models\Cart;
use App\Models\Reviews;
use App\Models\Driver;
use Config;
use Illuminate\Support\Facades\Log;
use Pusher\Pusher;
use DB;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Illuminate\Support\Facades\Storage;
 
class AnythingInstantly extends Controller
{
    function getCountryStateCity(Request $request){
        if(!empty($request->zipcode)){
            $where['z.zip']=$request->zipcode;
            $where['s.country_id']='223';
            $cart = new Cart();
            $data=$cart->getCountryStateCity($where);
            if($data){
                $response['data']= $data;
                $response['status'] = 1;
                $response['code'] = 200; 
                $response['message'] = "Country State City Data";
            }else{
                $response['data']= (object)[];
                $response['status'] = 0;
                $response['code'] = 402; 
                $response['message'] = "Zip Code not Found!";
            }
        }else{
            $response['data']= (object)[];
            $response['status'] = 0;
            $response['code'] = 402; 
            $response['message'] = "Zip Code is missing!";
        }
        return response()->json($response);
    }

    public function addUpdateRemoveProductFromCart(Request $request){
        if(empty($request->user_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer ID is missing!'];
            return response()->json($response);
        }
        $cart = new Cart();
        switch ($request->case) {
            case 1:
                if(empty($request->quantity)){
                    $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Quantity is missing!'];
                    return response()->json($response);
                }
                if(empty($request->product_id)){
                    $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Product ID is missing!'];
                    return response()->json($response);
                }
                if(empty($request->shipper_id)){
                    $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Shipper ID is missing!'];
                    return response()->json($response);
                }
                if($request->destroy_cart){
                    $cart->destroyCart($request->user_id);
                }
                $add_update_data=array(
                    'user_id'=>$request->user_id,
                    'quantity'=>$request->quantity,
                    'product_id'=>$request->product_id,
                    'shipper_id'=>$request->shipper_id,
                );
                $response=$cart->addProductToCart($add_update_data);
                $response['total_cart']=$cart->totalCartItem($request->user_id);
                return response()->json([
                    'status'=>$response['status'],
                    'code'=>$response['code'],
                    'message'=>$response['message'],
                    'data' => $response
                ]);
                break;
            case 2:
                if(empty($request->quantity)){
                    $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Product Quantity is missing!'];
                    return response()->json($response);
                }
                if(empty($request->cart_detail_id)){
                    $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Cart Item ID is missing!'];
                    return response()->json($response);
                }
                $add_update_data=array(
                    'user_id'=>$request->user_id,
                    'quantity'=>$request->quantity,
                    'cart_detail_id'=>$request->cart_detail_id,
                );
                $response=$cart->updateProductCartQuantity($add_update_data);
                return response()->json($response);    
                break;
            case 3:
                if(empty($request->id)){
                    $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Cart Item ID is missing!'];
                    return response()->json($response);
                }
                $status=$cart->removeProductFromCart(['id'=>$request->id,'user_id'=>$request->user_id]);
                $total_cart=$cart->totalCartItem($request->user_id);
                if($status){
					
				
                    $response= ['status'=>1,'code'=>200,'data'=>(object)['status'=>1,'total_cart'=>$total_cart,'message'=>'Product removed successfully '],'message'=>'Product removed successfully '];
                    return response()->json($response);
                }else{
                    $response= ['status'=>0,'code'=>402,'data'=>(object)[],'total_cart'=>$total_cart,'message'=>'Something went wrong. Please try again later!'];
                    return response()->json($response);
                } 
            break;
            default:
                $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Invalid Case!'];
                return response()->json($response);  
        }
    }
    public function checkProductQuantityInStock(Request $request){
        if(empty($request->user_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer ID is missing!'];
            return response()->json($response);
        }
        $cart = new Cart();
        $response=$cart->checkProductQuantityInStock(['user_id'=>$request->user_id]);
        return response()->json([
            'status'=>1,
            'code'=>200,
            'message'=>"Quantity checked",
            'data' =>[]
        ]);

    }
    public function addProductToCart(Request $request){
        if(empty($request->user_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer ID is missing!'];
            return response()->json($response);
        }
        if(empty($request->quantity)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Quantity is missing!'];
            return response()->json($response);
        }
        if(empty($request->product_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Product ID is missing!'];
            return response()->json($response);
        }
        if(empty($request->shipper_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Shipper ID is missing!'];
            return response()->json($response);
        }
        $cart = new Cart();
        if($request->destroy_cart){
          $cart->destroyCart($request->user_id);
        }
        $response=[];
        $add_update_data=array(
            'user_id'=>$request->user_id,
            'quantity'=>$request->quantity,
            'product_id'=>$request->product_id,
            'shipper_id'=>$request->shipper_id,
        );
        $response=$cart->addProductToCart($add_update_data);
        $response['total_cart']=$cart->totalCartItem($request->user_id);
        return response()->json([
            'status'=>$response['status'],
            'code'=>$response['code'],
            'message'=>$response['message'],
            'data' => $response
        ]);
     }

     public function getTotalCartItem(Request $request){
        if(empty($request->user_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer ID is missing!'];
            return response()->json($response);
        }
        $cart=new Cart();
        $response['status']=true;
        $response['total_cart']=$cart->totalCartItem($request->user_id);
        if($response['total_cart']>0){
            return response()->json([
                'data' => $response,
                'status'=>1,
                'code'=>200,
                'message'=>"Total Cart item"
            ]);
        }else{
            return response()->json([
                'data' => $response,
                'status'=>0,
                'code'=>402,
                'message'=>"No Cart Item"
            ]); 
        }
     }

     public function destroyCart(Request $request){
        if(empty($request->user_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer ID is missing!'];
            return response()->json($response);
        }
        $cart=new Cart();
        $response=$cart->destroyCart($request->user_id);
        return response()->json($response);
     }

     
     
     public function cartList(Request $request){
  
		if(empty($request->user_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer ID is missing!'];
            return response()->json($response);
        }
        $cart=new Cart();
        $response['status']=true;
        $response=$cart->cartList(['c.user_id'=>$request->user_id]);
        $response_data=[];
        if(count($response)){
			  //enable this after order
			//$discounted_price = 0;
			$sub_total_amount = 0;
			$sub_discounted_price = 0;
			$i=0;
			$cart_total = array();
            foreach($response as $row){
                $title=$row->title;
                $show_title=$title;
                if(strlen($title)>35){
                    $show_title= substr($title,0,35).'...';
                }
				
				$getProductPrice = $cart->getProductPrice($row->price,$row->discount);
						
				$product_price = $getProductPrice['product_price'];
				$discounted_price = $getProductPrice['discounted_price'];
				
                $response_data[]=array(
                    'cart_id'=>$row->cart_id,
                    'id'=>$row->id,
                    'product_id'=>$row->product_id,
                    'quantity'=>$row->quantity,
                    'title'=>$row->title,
                    'upc'=>$row->upc,
                    'image'=>$row->image,
                    'shipper_id'=>$row->shipper_id,
					'price'=>$product_price,
                    'discount'=>$row->discount,
					'product_type'=>$row->product_type,
                    'discounted_price'=>$discounted_price,
					// 'weight'=>$row->weight,
                    'weight'=>"",
					'ai_category_id'=>$row->ai_category_id,
                    'show_title'=>$show_title,
                   
                    'product_link'=>$row->product_id.'-'.preg_replace('/[^A-Za-z0-9\-]/', '', str_replace(" ","-",$row->title)),
                );
				
		 
				
				$sub_discounted_price += (float) $discounted_price * (int) $row->quantity;
				$sub_total_amount += (float) $product_price * (int) $row->quantity;
				$shipper_id = $row->shipper_id;
				
				if($row->ai_category_id == 13) { // check for cothing category to set tax zero for NJ)
					$ai_category_id = $row->ai_category_id;
				}
			 
            }
			//echo $sub_discounted_price; die;
			
			//echo "<br>". $i. "<br>discounted_price3 : ". $sub_discounted_price . "<br>";
			//echo "<br>". $i. "<br>sub_total_amount3 : ". $sub_total_amount . "<br>";
			
			if(isset($ai_category_id)){
				$ai_category_id = $ai_category_id;
			} else {
				$ai_category_id = "";
			}
			
			$sub_discounted_price = round($sub_discounted_price,2);
			$sub_total_amount = round($sub_total_amount,2);
			if(isset($request->coupon_id) && $request->coupon_id>0){
				$coupon_id = $request->coupon_id;
				
				$coupon = new Reviews();
				
				$couponData['coupon_id'] = $coupon_id;
				$couponData['user_id'] = $request->user_id;
				$couponData['order_origin'] = $request->order_origin?$request->order_origin:'';
				
				$getCoupon = (array) $coupon->getCouponList($couponData);
                
				if($getCoupon){
                    if($getCoupon['status']){
                        $coupon_discount = $getCoupon['total_discount'];
                        $discounted_price_after_coupon = $getCoupon['discounted_total'];
                    }else{
                        $coupon_discount = 0;
					    $discounted_price_after_coupon = $sub_discounted_price;
                    }
				} else {
					$coupon_id = "";
					$getCoupon = null;
					$coupon_discount = 0;
					$discounted_price_after_coupon = $sub_discounted_price;
				}
				//print_r($getCoupon); die;
				
			} else {
				$coupon_id = "";
				$getCoupon = null;
				$coupon_discount = 0;
				$discounted_price_after_coupon = $sub_discounted_price;
				
			}
		
			
			$cart_total['order_origin'] = $request->order_origin?$request->order_origin:'';
            $cart_total['ai_category_id'] = $ai_category_id;
            $cart_total['discounted_price'] = $sub_discounted_price;
			$cart_total['sub_total_amount'] = $sub_total_amount;
			$cart_total['discount_amount'] = round($sub_total_amount - $sub_discounted_price,2);
			$cart_total['shipper_id'] = $shipper_id;
			$cart_total['coupon_discount'] = $coupon_discount;
			$cart_total['discounted_price_after_coupon'] = $discounted_price_after_coupon;
			
			//print_R($cart_total); die;
			$getOrderMetaData=$cart->getOrderMetaData($cart_total); 
            return response()->json(
                [
                    'status'=>1,
                    'code'=>200,
                    'data'=>["cartlist"=>$response_data, 'orderMetaData'=>$getOrderMetaData,"couponDetail"=>$getCoupon],
                    'message'=>'Your Cart'
                ]
            );
        }else{
            return response()->json(
                [
                    'status'=>0,
                    'code'=>402,
                    'data'=>["cartlist"=>$response],
                    'message'=>'Your cart is feeling Lonely, fill it now!'
                ]
            );
        }
     }
	 

     public function getInvoiceData(Request $request){
        $customer_phone_number=$request->customer_phone_number;
        $cart=new Cart();
        $user_existance=$cart->getUserDetails(array('phone'=>$customer_phone_number));
        if($user_existance){
            $response['status']=true;
            $response=$cart->cartList(['c.user_id'=>$user_existance->id]);
            $response_data=[];
            $items=[];
            if(count($response)){
                $sub_total_amount = 0;
                $sub_discounted_price = 0;
                $i=0;
                $cart_total = array();
                $total_product_price=0;
                foreach($response as $row){
    
                    $title=$row->title;
                    $show_title=$title;
                    if(strlen($title)>35){
                        $show_title= substr($title,0,35).'...';
                    }
                    
                    $getProductPrice = $cart->getProductPrice($row->price,$row->discount);
                            
                    $product_price = $getProductPrice['product_price'];
                    $discounted_price = $getProductPrice['discounted_price'];
                    /*
                    [
                        "name"=> "Yoga Mat",
                        "description"=> "Elastic mat to practice yoga.",
                        "quantity"=> "1",
                        "unit_amount"=> [
                            "currency_code"=> "USD",
                            "value"=> "50.00"
                        ],
                        "tax"=> [
                            "name"=> "Sales Tax",
                            "percent"=> "7.25"
                        ],
                        "discount"=> [
                            "percent"=> "5"
                        ],
                        "unit_of_measure"=> "QUANTITY"
                    ],
                    */
                    
                    $items[]=[
                        "name"=>$row->title,
                        "description"=>$row->description,
                        "quantity"=>$row->quantity,
                        "unit_amount"=>[
                            "currency_code"=>"USD",
                            "value"=>$getProductPrice['discounted_price']
                        ],
                        
                        "tax"=> [
                            "name"=> "Sales Tax",
                            "percent"=> "0.00"
                        ],
                        "discount"=> [
                            "percent"=> "0.00"
                        ],
                        "unit_of_measure"=> "QUANTITY"
                        
                    ];
                    $total_product_price =$total_product_price+($getProductPrice['discounted_price']*$row->quantity);
                    $response_data[]=array(
                        'cart_id'=>$row->cart_id,
                        'id'=>$row->id,
                        'product_id'=>$row->product_id,
                        'quantity'=>$row->quantity,
                        'title'=>$row->title,
                        'upc'=>$row->upc,
                        'image'=>$row->image,
                        'shipper_id'=>$row->shipper_id,
                        'price'=>$product_price,
                        'discount'=>$row->discount,
                        'product_type'=>$row->product_type,
                        'discounted_price'=>$discounted_price,
                        'ai_category_id'=>$ai_category_id,
                        // 'weight'=>$row->weight,
                        'weight'=>"",
                        'show_title'=>$show_title,
                       
                        'product_link'=>$row->product_id.'-'.preg_replace('/[^A-Za-z0-9\-]/', '', str_replace(" ","-",$row->title)),
                    );
                    
					
                    
                    $sub_discounted_price += (float) $discounted_price * (int) $row->quantity;
                    $sub_total_amount += (float) $product_price * (int) $row->quantity;
                    $shipper_id = $row->shipper_id;
					
					if($row->ai_category_id == 13) { // check for cothing category to set tax zero for NJ)
						$ai_category_id = $row->ai_category_id;
					}
					
                }

                if(isset($ai_category_id)){
					$ai_category_id = $ai_category_id;
				} else {
					$ai_category_id = "";
				}
                $sub_discounted_price = round($sub_discounted_price,2);
                $sub_total_amount = round($sub_total_amount,2);
                if(isset($request->coupon_id) && $request->coupon_id>0){
                    $coupon_id = $request->coupon_id;
                    
                    $coupon = new Reviews();
                    
                    $couponData['coupon_id'] = $coupon_id;
                    $couponData['user_id'] = $request->user_id;
                    $couponData['order_origin'] = $request->order_origin?$request->order_origin:'';
                    
                    $getCoupon = (array) $coupon->getCouponList($couponData);
                    
                    if($getCoupon){
                        if($getCoupon['status']){
                            $coupon_discount = $getCoupon['total_discount'];
                            $discounted_price_after_coupon = $getCoupon['discounted_total'];
                        }else{
                            $coupon_discount = 0;
                            $discounted_price_after_coupon = $sub_discounted_price;
                        }
                    } else {
                        $coupon_id = "";
                        $getCoupon = null;
                        $coupon_discount = 0;
                        $discounted_price_after_coupon = $sub_discounted_price;
                    }
                    //print_r($getCoupon); die;
                    
                } else {
                    $coupon_id = "";
                    $getCoupon = null;
                    $coupon_discount = 0;
                    $discounted_price_after_coupon = $sub_discounted_price;
                    
                }
        
                $cart_total['order_origin'] = $request->order_origin?$request->order_origin:'';
                $cart_total['ai_category_id'] = $ai_category_id;
                $cart_total['discounted_price'] = $sub_discounted_price;
                $cart_total['sub_total_amount'] = $sub_total_amount;
                $cart_total['discount_amount'] = round($sub_total_amount - $sub_discounted_price,2);
                $cart_total['shipper_id'] = $shipper_id;
                $cart_total['coupon_discount'] = $coupon_discount;
                $cart_total['discounted_price_after_coupon'] = $discounted_price_after_coupon;
                


                //print_R($cart_total); die;
                $getOrderMetaData=$cart->getOrderMetaData($cart_total);
               // $invoice_no='INV-'.time();
               $total_coupon_discount=$getOrderMetaData['coupon_discount'];
               if($total_coupon_discount>0){
                $total_discount_percent=number_format((100*$total_coupon_discount)/$total_product_price,2);
               }else{
                $total_discount_percent=0.00;
               }

               $total_taxes=number_format((100*$getOrderMetaData['tax'])/$total_product_price,2);

                 // DB::table('ai_pos_order_webhook')
                 //  ->insert(['webhook_type'=>'paypal','transaction_id'=>'111111111','payment_status'=>'1','wh_user_Email'=>$request->paypal_email_address,'order_status'=>0]);
               $invoice_data=[
                "detail"=>[
                    "invoice_number" => "123456789".time(),
                    "invoice_date"=> date('Y-m-d'),
                   // "payment_term"=> [
                    //    "term_type"=> "NET_10",
                    //    "due_date"=> "2022-02-14"
                    //],
                    "currency_code"=> "USD",
                  //  "reference"=> "<The reference data. Includes a post office (PO) number.>",
                   // "note"=> "<A note to the invoice recipient. Also appears on the invoice notification email.>",
                   // "terms_and_conditions"=> "<The general terms of the invoice. Can include return or cancellation policy and other terms and conditions.>",
                   // "memo"=> "<A private bookkeeping note for merchant.>"
                ],
                /*
                "invoicer"=> [
                    "name"=> [
                        "given_name"=> "David",
                        "surname"=> "Larusso"
                    ],
                    "address"=> [
                        "address_line_1"=> "123 Townsend St",
                        "address_line_2"=> "Floor 6",
                        "admin_area_2"=> "San Francisco",
                        "admin_area_1"=> "CA",
                        "postal_code"=> "94107",
                        "country_code"=> "US"
                ],
                    "phones"=> [
                        [
                            "country_code"=> "001",
                            "national_number"=> "4085551234",
                            "phone_type"=> "MOBILE"
                        ]
                    ],
                    "website"=> "www.example.com",
                    "tax_id"=> "XX-XXXXXXX",
                    "logo_url"=> "https://example.com/logo.png",
                    "additional_notes"=> "<Any additional information. Includes business hours.>"
                ],
                */
                "primary_recipients"=> [
                    [
                        "billing_info"=> [
                            
                            "name"=> [
                                "given_name"=>"sk ".$user_existance->name,
                                "surname"=> $user_existance->name
                            ],
                            "address"=> [
                                "address_line_1"=> "1234 Main Street",
                                "admin_area_2"=> "Anytown",
                                "admin_area_1"=> "CA",
                                "postal_code"=> "98765",
                                "country_code"=> "US"
                            ],
                            
                             "email_address"=> $request->paypal_email_address,
                              "phones"=> [
                                [
                                    "country_code"=> "001",
                                    "national_number"=> "4884551234",
                                    "phone_type"=> "HOME"
                                ]
                            ],
                             
                              "additional_info_value"=> "add-info"
                         ],
                        "shipping_info"=> [
                            "name"=> [
                                "given_name"=> $user_existance->name,
                                "surname"=> $user_existance->name
                            ],
                            "address"=> [
                                "address_line_1"=> $user_existance->address,
                               // "admin_area_2"=> "Anytown",
                                "admin_area_1"=> "CA",
                                "postal_code"=> "98765",
                                "country_code"=> "US"
                            ]
                        ]
                        
                    ]
                ],
                "items"=> 
                     $items,
                 "configuration"=> [
                    "partial_payment"=> [
                        "allow_partial_payment"=> false
                    ],
                    "allow_tip"=> false,
                    "tax_calculated_after_discount"=> true,
                    "tax_inclusive"=> false
                ],
                "amount"=> [
                    "breakdown"=> [
                        "custom"=> [
                            "label"=> "Packing Charges",
                            "amount"=> [
                                "currency_code"=> "USD",
                                "value"=> "0.00"
                            ]
                        ],
                        "shipping"=> [
                            "amount"=> [
                                "currency_code"=> "USD",
                                 "value"=> "0.00",
                               // "value"=> $getOrderMetaData['tax']
                            ],
                            "tax"=> [
                                "name"=> "Sales Tax",
                               // "percent"=> $getOrderMetaData->tax,
                               //"percent"=>$total_taxes,
                               "percent"=>6.62,
                               ]
                        ],
                        "discount"=> [
                            "invoice_discount"=> [
                              //  "percent"=> $getOrderMetaData->coupon_discount,
                            //  "percent"=>$total_discount_percent,
                              "percent"=>10,
                              ]
                        ]
                    ]
                ]
                 
            ];

                return response()->json(
                [
                    'status'=>1,
                    'code'=>200,
                    'code'=>$total_taxes,
                    'data'=>['invoice_data'=>$invoice_data],
                    'message'=>'Your Cart'
                ]
                );
            }else{
                return response()->json(
                    [
                        'status'=>0,
                        'code'=>402,
                        'data'=>["cartlist"=>$response],
                        'message'=>'Your cart is feeling Lonely, fill it now!'
                    ]
                );
            }

            return response()->json(['status'=>1,'case'=>0,'code'=>402,'user_id'=>$user_existance->id,'name'=>$user_existance->name,'email'=>$user_existance->email,'phone'=>$user_existance->phone,'data'=>(object)[],'message'=>'User Found!']);
        }else{
            return response()->json(['status'=>0,'case'=>0,'code'=>402,'user_id'=>0,'data'=>(object)[],'message'=>'Customer not found!']);
        }
     
       
         
     }
     public function removeProductFromCart(Request $request){
        if(empty($request->user_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer ID is missing!'];
            return response()->json($response);
        }
        if(empty($request->id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Cart Item ID is missing!'];
            return response()->json($response);
        }
        $cart=new Cart();
        $status=$cart->removeProductFromCart(['id'=>$request->id,'user_id'=>$request->user_id]);
        $total_cart=$cart->totalCartItem($request->user_id);
        if($status){
			if($total_cart!=0){
				$getCartDetails=$cart->getCartDetails($request->user_id);
				
                $cart_total['order_origin'] = $request->order_origin?$request->order_origin:'';
				$cart_total['shipper_id'] = $getCartDetails['shipper_id'];
				$cart_total['sub_total_amount'] = $getCartDetails['sub_total_amount'];
				$cart_total['discount_amount'] = $getCartDetails['discount_amount'];
				$cart_total['discounted_price'] = $getCartDetails['discounted_price'];
				$cart_total['ai_category_id'] = $getCartDetails['ai_category_id'];
				
				if(isset($request->coupon_id)){
					$coupon_id = $request->coupon_id;
					
					$coupon = new Reviews();
					
					$couponData['coupon_id'] = $coupon_id;
					$couponData['user_id'] = $request->user_id;
					$couponData['order_origin'] = $request->order_origin?$request->order_origin:'';
					
					$getCoupon = (array) $coupon->getCouponList($couponData);
					
					if($getCoupon){
						
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
				
				 
				$getOrderMetaData=$cart->getOrderMetaData($cart_total); 
			
			}else {
				$getOrderMetaData = null;
				$getCoupon = null;
			}			
			
            $response= ['status'=>1,'code'=>200,'data'=>(object)['status'=>1,'total_cart'=>$total_cart,'message'=>'Product removed successfully ','OrderMetaData'=>$getOrderMetaData,"couponDetail"=>$getCoupon],'message'=>'Product removed successfully '];
            return response()->json($response);
        }else{
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'total_cart'=>$total_cart,'message'=>'Something went wrong. Please try again later!'];
            return response()->json($response);
        }
     }
     public function mergeCart(Request $request){
        if(empty($request->user_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer OLD ID is missing!'];
            return response()->json($response);
        }
        if(empty($request->id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer Current ID is missing!'];
            return response()->json($response);
        }
        $cart=new Cart();
        $status=$cart->mergeCart($request->user_id,$request->id);
        if($status){
            $response= ['status'=>1,'code'=>200,'data'=>(object)[],'message'=>'Cart Merged successfully!'];
            return response()->json($response); 
        }else{
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Something Went Wrong!'];
            return response()->json($response); 
        }
     }

     public function deleteUser(Request $request){
        if(empty($request->user_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'User ID is missing!'];
            return response()->json($response);
        }
        $cart=new Cart();
        if($request->full_delete==1){
            $cart->deleteOrder($request->user_id);
            $cart->deleteCart($request->user_id);
            $cart->deleteWishList($request->user_id);
            $cart->deleteCustomerAddress(['customer_id'=>$request->user_id]);
            $user_response=$cart->deleteUser($request->user_id);
            if($user_response['status']){
                $response= ['status'=>1,'code'=>200,'data'=>(object)[],'message'=>'Complete Data Deleted Successfully!'];
            }else{
                $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Invalid user ID!'];
            }
        }else if($request->full_delete=='0'){
              if($request->order=1){
                $cart->deleteOrder($request->user_id);
            }
            if($request->cart=1){
                $cart->deleteCart($request->user_id);
            }
            if($request->wishlist=1){
                $cart->deleteWishList($request->user_id);
            }
            if($request->address=1){
                $cart->deleteCustomerAddress(['customer_id'=>$request->user_id]);
            }
            $response= ['status'=>1,'code'=>200,'data'=>(object)[],'message'=>'Data Deleted Successfully!'];
        }else{
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Invalid Choice for delete!'];
        }
        return response()->json($response);
     }

     public function checkShipperOldNew(Request $request){
        if(empty($request->user_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer OLD ID is missing!'];
            return response()->json($response);
        }
        if(empty($request->id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer Current ID is missing!'];
            return response()->json($response);
        }
        $cart=new Cart();
        $response=$cart->checkShipperOldNew($request->user_id,$request->id);
        return response()->json($response);
     }
     public function activateNewCartClearOldCart(Request $request){
        if(empty($request->user_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer OLD ID is missing!'];
            return response()->json($response);
        }
        if(empty($request->id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer Current ID is missing!'];
            return response()->json($response);
        }
        $cart=new Cart();
        $response['status']=true;
        $response=$cart->activateNewCartClearOldCart($request->id,$request->user_id);
        if($response['status']){
            $response= ['status'=>1,'code'=>200,'data'=>(object)$response,'message'=>'Success'];
            return response()->json($response);  
        }else{
            $response= ['status'=>0,'code'=>402,'data'=>(object)$response,'message'=>'Failure'];
            return response()->json($response);  
        }
     }
     public function activateOldCartClearNewCart(Request $request){
        if(empty($request->user_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer OLD ID is missing!'];
            return response()->json($response);
        }
        $cart=new Cart();
        $response['status']=true;
        $response=$cart->activateOldCartClearNewCart($request->user_id);
        if($response['status']){
            $response= ['status'=>1,'code'=>200,'data'=>(object)$response,'message'=>'Success'];
            return response()->json($response);  
        }else{
            $response= ['status'=>0,'code'=>402,'data'=>(object)$response,'message'=>'Failure'];
            return response()->json($response);  
        }
     }
     

     public function createOrder(Request $request){
        if(empty($request->user_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer ID is missing!'];
            return response()->json($response);
        }
        if(empty($request->name)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer Name is missing!'];
            return response()->json($response);
        }
        if(empty($request->phone)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer Phone is missing!'];
            return response()->json($response);
        }
        if(empty($request->address)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer Address is missing!'];
            return response()->json($response);
        }
        if(empty($request->city)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer City is missing!'];
            return response()->json($response);
        }
        if(empty($request->country)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer Country is missing!'];
            return response()->json($response);
        }
        if(empty($request->zip_code)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer Zip Code is missing!'];
            return response()->json($response);
        }
        if(empty($request->total_payable_amount)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Total payable amount is missing!'];
            return response()->json($response);
        }
        if(empty($request->payment_id)){
           // $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Payment ID is missing!'];
            //return response()->json($response);
        }
		
		if(!isset($request->coupon_id)){
			$request->coupon_id = null;
		} 
		if(!isset($request->coupon_id)){
			$request->email = "";
		} 

		if(!isset($request->discounted_amount_after_coupon)){
			$request->discounted_amount_after_coupon = null;
		} 
		
		if(!isset($request->orderMetaData)){
			//$response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Order Meta data is missing!'];
            //return response()->json($response);
			$request->orderMetaData = null;
		}
        if(empty($request->invoice_no)){
            $invoice_no='inv-'.time(); 
        }else{
            $invoice_no=$request->invoice_no;
        }

        if(empty($request->invoice_id)){
            $invoice_id='0'; 
        }else{
            $invoice_id=$request->invoice_id;
        }
        if(empty($request->billing_email)){
            $billing_email=''; 
        }else{
            $billing_email=$request->billing_email;
        }
        $order_data=array(
            'invoice_no'=>$invoice_no,
            'pp_invoice_id'=>$invoice_id,
            'pp_billing_email'=>$billing_email,
			'user_id'=>$request->user_id,
			'customer_address_id'=>$request->customer_address_id,
			'name'=>$request->name, 
			'order_reference'=>$request->order_reference,
			'pos_order_status'=>$request->pos_order_status?$request->pos_order_status:'Pending',
			'address_name'=>$request->address_name?$request->address_name:'Other',
			'email'=>$request->email?$request->email:'',
			'phone'=>$request->phone,
			'address'=>$request->address,
			'city'=>$request->city,
			'state'=>$request->state,
			'country'=>$request->country,
			'zip_code'=>$request->zip_code,
			'total_payable_amount'=>$request->total_payable_amount,
			'payment_status'=>$request->payment_status?$request->payment_status:0,
			'payment_method'=>$request->payment_method?$request->payment_method:'',			
			'payment_id'=>$request->payment_id,			
			'coupon_id'=>$request->coupon_id,			
			'booking_id'=>$request->booking_id,			
			'driver_id'=>$request->driver_id??0,			
			'reference'=>$request->reference?$request->reference:0,			
			'discounted_amount_after_coupon'=>$request->discounted_amount_after_coupon,	
			'orderMetaData' => $request->orderMetaData,
		);

        if(empty($request->order_created_by_type)){
            $order_data['order_created_by_type']=0;
        }else{
            $order_data['order_created_by_id']=$request->order_created_by_id;
        }

        if(empty($request->order_created_by_id)){
            $order_data['order_created_by_id']=$request->user_id;
        }else{
            $order_data['order_created_by_id']=$request->order_created_by_id;
        }
        $cart=new Cart(); 
        if(empty($request->customer_address_id) && $request->order_reference!='POS'){
            $order_data['customer_address_id']=$cart->addAddress([
                'user_id'=>$request->user_id,
				'address_name'=>$request->address_name?$request->address_name:'Other',
				'name'=>$request->name,
				'phone'=>$request->phone,
				'email'=>$request->email?$request->email:'',
				'address'=>$request->address,
				'address2'=>"",
				'city'=>$request->city,
				'state'=>$request->state,
				'country'=>$request->country,
                'zip_code'=>$request->zip_code,
            ]);   
        }else{
            $order_data['customer_address_id']=0;
        }
        $response=$cart->createOrder($order_data);
		$shipper_details = $response['shipper_details']; 
        if($response['status']){

            // Create pusher new channel each order wise

            // try {
            
            //     // Generate a unique channel name based on the order ID
            //     $channelName = 'order_channel_' . $response['order_id'];
    
            //     // Pusher credentials from your .env file
            //     $options = [
            //         'cluster' => env('PUSHER_APP_CLUSTER'),
            //         'encrypted' => true
            //     ];
    
            //     // Create a new Pusher instance
            //     $pusher = new Pusher(
            //         env('PUSHER_APP_KEY'),
            //         env('PUSHER_APP_SECRET'),
            //         env('PUSHER_APP_ID'),
            //         $options
            //     );
    
            //     // Create the new channel dynamically using Pusher Channels API
            //     $pusher->createChannel($channelName);
    
            //     \Log::info(print_r("pusher order channel created ", true));
            
            // } catch (\Exception $e) {
            //     // Handle any exceptions that occur
            //     \Log::info("Pusher create channel error - ".print_r($e->getMessage(), true));
            // }

            if($order_data['order_reference']!='POS'){
                $user_profile=$cart->viewCustomerProfile(['u.id'=>$request->user_id]);
				
				$seller_mail_message='<!DOCTYPE html>
                    <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
                    <head>
                      <meta charset="utf8">
                      <meta http-equiv="x-ua-compatible" content="ie=edge">
                      <meta name="viewport" content="width=device-width, initial-scale=1">
                      <meta name="x-apple-disable-message-reformatting">
                      <title>Happy news: order received!</title>
                    
                    </head>
                    <body lang="en" style="margin: 0; padding: 0; width: 100%; word-break: break-word; -webkit-font-smoothing: antialiased; background-color: #ffffff;">
                    <table class="wrapper" style="width: 100%;font-family: -apple-system, Segoe UI, sans-serif !important;" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td align="left" style bgcolor="#ffffff">
                          <table class="sm-w-full" style="width: 640px;" cellpadding="0" cellspacing="0" role="presentation">
                            <tr>
                              <td class="sm-px-16 sm-py-24" style="padding-left: 40px; padding-right: 40px; padding-top: 48px; padding-bottom: 48px; text-align: left;" bgcolor="#ffffff" align="left">
                                 
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;"><b>Hey '.$shipper_details->firstname.' '.$shipper_details->lastname.',</b> 👋</p>
                                            <div class="" style="line-height: 16px;">&nbsp;</div>			
                                
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">Congratulations! You\'ve received a new order with the Order ID # '.$response['order_id'].'  from AnythingInstantly</p> 
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">Check your Shipting Account for details and ensure a smooth fulfillment process.</p>
                                <div class="" style="line-height: 16px;">&nbsp;</div>
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">We value your opinion to improve continuously. If you have any suggestions/queries, write us at <a href="mailto:support@shipting.com"><b>support@shipting.com</b></a></p>
                                <div class="" style="line-height: 16px;">&nbsp;</div>
                                 
                                <div class="" style="line-height: 16px;">&nbsp;</div>
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">Best Regards,</br>
                                </p>
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">
                                Shipting</p>
                            
                                
                               
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    </body>
                    </html>';
				
				$seller_email=array($shipper_details->email);
				$seller_from_arr=[
					'name' => 'Team Shipting',
					'email' => 'info@shipting.com',  
				];
				$seller_subject = 'Shipting: New Order Alert!';
				 
				$seller_sendmaill = $this->sendmail($seller_email,$seller_from_arr,$seller_subject,$seller_mail_message);
				$sendmaill='';
                if($order_data['order_reference']!="EXTERNALORDER"){
                    $mail_message='<!DOCTYPE html>
                    <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
                    <head>
                      <meta charset="utf8">
                      <meta http-equiv="x-ua-compatible" content="ie=edge">
                      <meta name="viewport" content="width=device-width, initial-scale=1">
                      <meta name="x-apple-disable-message-reformatting">
                      <title>Happy news: order confirmed!</title>
                    
                    </head>
                    <body lang="en" style="margin: 0; padding: 0; width: 100%; word-break: break-word; -webkit-font-smoothing: antialiased; background-color: #ffffff;">
                    <table class="wrapper" style="width: 100%;font-family: -apple-system, Segoe UI, sans-serif !important;" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td align="left" style bgcolor="#ffffff">
                          <table class="sm-w-full" style="width: 640px;" cellpadding="0" cellspacing="0" role="presentation">
                            <tr>
                              <td class="sm-px-16 sm-py-24" style="padding-left: 40px; padding-right: 40px; padding-top: 48px; padding-bottom: 48px; text-align: left;" bgcolor="#ffffff" align="left">
                                <div style="text-align:center">
                                  <a href="https://anythinginstantly.com" style="color: #0047c3; text-decoration: none;">
                                    <img src="https://anythinginstantly.com/photo/logo.png" alt="anythinginstantly" width="250" style="line-height: 100%; vertical-align: middle; border: 0;">
                                  </a>
                                </div>                    
                                <div style="background-color: #d4d4d9; height: 0.5px; line-height: 1px;margin:22px 0px;">&nbsp;</div>
                    
                    
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;"><b>Hey '.$user_profile->name.',</b> 👋</p>
                                            <div class="" style="line-height: 16px;">&nbsp;</div>			
                                
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">Thank you for ordering from Anything instantly!</p> 
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">We are starting to process your order# '.$response['order_id'].' , you will be able to track it shortly.. 🤩</p>
                                <div class="" style="line-height: 16px;">&nbsp;</div>
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">We value your opinion to improve continuously. If you have any suggestions/queries, write us at <a href="mailto:support@anythinginstantly.com"><b>support@anythinginstantly.com</b></a></p>
                                <div class="" style="line-height: 16px;">&nbsp;</div>
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">You can track your order <a href="https://anythinginstantly.com/order-successful/'.base64_encode($response['order_id']).'">here</a>.</p>
                                
                                <div class="" style="line-height: 16px;">&nbsp;</div>
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">Thank you for your time.</br>
                                </p>
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">
                                Anything Instantly</p>
                            
                                
                                <div class="" style="line-height: 16px;">&nbsp;</div>
                                            <div style="text-align: left;">
                                  <table style="width: 100%;" cellpadding="0" cellspacing="0" role="presentation">
                                  
                                    <tr>
                                      <td style="padding-bottom: 16px; padding-top: 16px;">
                                        <div style="background-color: #d4d4d9; height: 0.5px; line-height: 1px;">&nbsp;</div>
                                      </td>
                                    </tr>
                                    <tr>
                                        <td align="center" dir="ltr" valign="top" style="padding:0 24px 0 24px">
                                        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                        <tbody><tr>
                    
                                        <td align="center" valign="top" width="20" style="width:20px">
                                        &nbsp;
                                        </td>
                                        <td align="center" valign="top">
                                        <table align="center" valign="top" cellspacing="0" cellpadding="0" role="presentation">
                                        <tbody><tr>
                                        <td align="center" valign="top"><a href="https://www.instagram.com/__anythinginstantly__/" style="text-decoration:none" target="_blank"><img src="https://anythinginstantly.com/image/instagram-48.png" width="33" height="auto" style="padding:11px 8px;width:33px;height:auto;display:block" border="0" title="Follow YouTube Creators on Instagram " alt="Follow YouTube Creators on Instagram " class="CToWUd" data-bit="iit"></a></td>
                                        </tr>
                                        </tbody></table>
                                        </td>
                                        <td align="center" valign="top">
                                        <table align="center" valign="top" cellspacing="0" cellpadding="0" role="presentation">
                                        <tbody><tr>
                                        <td align="center" valign="top"><a href="https://www.facebook.com/people/Anything-Instantly/100084401683757/" style="text-decoration:none" target="_blank"><img src="https://anythinginstantly.com/image/facebook-48.png" width="33" height="auto" style="padding:11px 8px;width:33px;height:auto;display:block" border="0" title="Follow YouTube Creators on facebook " alt="Follow YouTube Creators on facebook " class="CToWUd" data-bit="iit"></a></td>
                                        </tr>
                                        </tbody></table>
                                        </td>
                                        </tr>
                                        </tbody></table>
                                        </td>
                                        </tr>
                                  </table>
                                  <p style="line-height: 16px; margin: 0; color: #8492a6; font-size: 12px;text-align: center;">&copy; 2024 AnythingInstantly. All rights reserved.</p>
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    </body>
                    </html>';
                    $email=array($user_profile->email);
                    $from_arr=[
                        'name' => 'Team Anything Instantly',
                        'email' => 'info@shipting.com',  
                    ];
                    $subject="Anything Instantly: Order Confirmed ";
                    $sendmaill = $this->sendmail($email,$from_arr,$subject,$mail_message);
                }
               // }else{
               /*     $mail_message='<!DOCTYPE html>
                    <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
                    <head>
                      <meta charset="utf8">
                      <meta http-equiv="x-ua-compatible" content="ie=edge">
                      <meta name="viewport" content="width=device-width, initial-scale=1">
                      <meta name="x-apple-disable-message-reformatting">
                      <title>Happy news: order confirmed!</title>
                    
                    </head>
                    <body lang="en" style="margin: 0; padding: 0; width: 100%; word-break: break-word; -webkit-font-smoothing: antialiased; background-color: #ffffff;">
                    <table class="wrapper" style="width: 100%;font-family: -apple-system, Segoe UI, sans-serif !important;" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td align="left" style bgcolor="#ffffff">
                          <table class="sm-w-full" style="width: 640px;" cellpadding="0" cellspacing="0" role="presentation">
                            <tr>
                              <td class="sm-px-16 sm-py-24" style="padding-left: 40px; padding-right: 40px; padding-top: 48px; padding-bottom: 48px; text-align: left;" bgcolor="#ffffff" align="left">
                                <div style="text-align:center">
                                  <a href="https://anythinginstantly.com" style="color: #0047c3; text-decoration: none;">
                                    <img src="https://anythinginstantly.com/photo/logo.png" alt="anythinginstantly" width="250" style="line-height: 100%; vertical-align: middle; border: 0;">
                                  </a>
                                </div>                    
                                <div style="background-color: #d4d4d9; height: 0.5px; line-height: 1px;margin:22px 0px;">&nbsp;</div>
                    
                    
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;"><b>Hey '.$user_profile->name.',</b> 👋</p>
                                            <div class="" style="line-height: 16px;">&nbsp;</div>			
                                
                        <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">Thank you for ordering from Anything instantly!</p> 
                        <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">Payment Failed!</p> 
                        <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">you can complete your order after make payment!<a href="http://stage.anythinginstantly.com/retry-payment/'.base64_encode($response['order_id']).'">Pay Now</a></p> 
                        <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">We are starting to process your order# '.$response['order_id'].', you will be able to track it shortly.. 🤩</p>
                                <div class="" style="line-height: 16px;">&nbsp;</div>
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">We value your opinion to improve continuously. If you have any suggestions/queries, write us at <a href="mailto:support@anythinginstantly.com"><b>support@anythinginstantly.com</b></a></p>
                                <div class="" style="line-height: 16px;">&nbsp;</div>
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">You can track your order <a href="http://stage.anythinginstantly.com/order-successful/'.base64_encode($response['order_id']).'">here</a>.</p>
                                
                                <div class="" style="line-height: 16px;">&nbsp;</div>
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">Thank you for your time.</br>
                                </p>
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">
                                Anything Instantly</p>
                            
                                
                                <div class="" style="line-height: 16px;">&nbsp;</div>
                                            <div style="text-align: left;">
                                  <table style="width: 100%;" cellpadding="0" cellspacing="0" role="presentation">
                                  
                                    <tr>
                                      <td style="padding-bottom: 16px; padding-top: 16px;">
                                        <div style="background-color: #d4d4d9; height: 0.5px; line-height: 1px;">&nbsp;</div>
                                      </td>
                                    </tr>
                                    <tr>
                                        <td align="center" dir="ltr" valign="top" style="padding:0 24px 0 24px">
                                        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                        <tbody><tr>
                    
                                        <td align="center" valign="top" width="20" style="width:20px">
                                        &nbsp;
                                        </td>
                                        <td align="center" valign="top">
                                        <table align="center" valign="top" cellspacing="0" cellpadding="0" role="presentation">
                                        <tbody><tr>
                                        <td align="center" valign="top"><a href="https://www.instagram.com/__anythinginstantly__/" style="text-decoration:none" target="_blank"><img src="https://anythinginstantly.com/image/instagram-48.png" width="33" height="auto" style="padding:11px 8px;width:33px;height:auto;display:block" border="0" title="Follow YouTube Creators on Instagram " alt="Follow YouTube Creators on Instagram " class="CToWUd" data-bit="iit"></a></td>
                                        </tr>
                                        </tbody></table>
                                        </td>
                                        <td align="center" valign="top">
                                        <table align="center" valign="top" cellspacing="0" cellpadding="0" role="presentation">
                                        <tbody><tr>
                                        <td align="center" valign="top"><a href="https://www.facebook.com/people/Anything-Instantly/100084401683757/" style="text-decoration:none" target="_blank"><img src="https://anythinginstantly.com/image/facebook-48.png" width="33" height="auto" style="padding:11px 8px;width:33px;height:auto;display:block" border="0" title="Follow YouTube Creators on facebook " alt="Follow YouTube Creators on facebook " class="CToWUd" data-bit="iit"></a></td>
                                        </tr>
                                        </tbody></table>
                                        </td>
                                        </tr>
                                        </tbody></table>
                                        </td>
                                        </tr>
                                  </table>
                                  <p style="line-height: 16px; margin: 0; color: #8492a6; font-size: 12px;text-align: center;">&copy; 2024 AnythingInstantly. All rights reserved.</p>
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    </body>
                    </html>';
                    $email=array($user_profile->email);
                    $from_arr=[
                        'name' => 'Team Anything Instantly',
                        'email' => 'info@shipting.com',  
                    ];
                    $subject="payment failed ";
                    $sendmaill = $this->sendmail($email,$from_arr,$subject,$mail_message);
                } */
				//echo $mail_message; 
				$response['sendmaill'] = $sendmaill;
				
                
            }
			$response['seller_sendmaill'] = $seller_sendmaill;
			unset($response['shipper_details']);
            return response()->json([
                'data' => $response,
                'status' => 1,
                'code' => 200,
                'message' => $response['message'],
            ]);
        }else{
            return response()->json([
                'data' => (object)[],
                'status' => 0,
                'code' => 402,
                'new_data'=>$response,
                'message' => "Something Went Wrong!",
            ]);
        }
     }



     public function orderListTotal(Request $request){
        if(empty($request->customer_id)){
            //$response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer ID is missing!'];
            //return response()->json($response);
        }
        $cart=new cart();
        $where=[];
        if(!empty($request->customer_id)){
            $where=['o.customer_id'=>$request->customer_id];
        }
        if($request->shipper_id>0){
            $where['o.shipper_id']=$request->shipper_id;
        }
        if($request->order_created_by_id>0){
            $where['o.order_created_by_id']=$request->order_created_by_id;
        }
        if($request->id>0){
            $where['o.id']=$request->id;
        }

        if($request->order_reference!=''){
            $where['o.order_reference']=$request->order_reference;
        }

        if(isset($request->search_string)) {
			$search_string = $request->search_string;
		} else {
			$search_string ="";
		}
		
		if(isset($request->status_type)) {
			$status_type = $request->status_type;
		} else {
			$status_type ="";
		}
		$options = array('search_string'=>$search_string,'status_type'=>$status_type);
        $orders=$cart->orderListTotal($where,$options);
        return response()->json(
            [
                'status'=>1,
                'code'=>200,
                'data'=>$orders,
                'message'=>'Total Order'
            ]
        );

     }


     public function orderList(Request $request){
        if(empty($request->customer_id)){
           // $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer ID is missing!'];
            //return response()->json($response);
        }
        $cart=new cart();
        $where=[];
        if($request->customer_id>0){
            $where['o.customer_id']=$request->customer_id;
        }
        if($request->shipper_id>0){
            $where['o.shipper_id']=$request->shipper_id;
        }
        if($request->id>0){
            $where['o.id']=$request->id;
        }

        if(isset($request->order_reference)) {
            $where['o.order_reference']=$request->order_reference;
		}
        if($request->order_created_by_id>0){
            $where['o.order_created_by_id']=$request->order_created_by_id;
        }
		
		if(isset($request->limit_id)) {
			$limit_id = $request->limit_id;
		} else {
			$limit_id ="";
		}

        if(isset($request->search_string)) {
			$search_string = $request->search_string;
		} else {
			$search_string ="";
		}
		
		if(isset($request->status_type)) {
			$status_type = $request->status_type;
		} else {
			$status_type ="";
		}

        
		if(isset($request->page)) {
			
			$page = $request->page; //1 , 2
		} else {
			$page ="1";
		}
		if(isset($request->items)) {
			
			$items = $request->items; //20 , 20 
		} else {
			$items ="20";
		}
		
	 
		$limit1 = (($page * $items) - $items); //(($page * $items) - $items);		
		 
		$limit2 = $items; 
		
		$options = array('search_string'=>$search_string,'status_type'=>$status_type,'limit1'=>$limit1,'limit2'=>$limit2,'limit_id'=>$limit_id);
		
        $orders=$cart->orderList($where,$options);
		 
        $order_data=[];
        foreach($orders as $order){
            
			$shipperDetails = $cart->shipperDetails(['u.wh_account_id'=>$order->shipper_id]);
            $place='';
            if($shipperDetails){
				if($shipperDetails->company){
					$place = $shipperDetails->company."'s place"; 
				} else {
					$place = $shipperDetails->firstname."'s place"; 
				}
            }
			$order_date = $order->order_date;
			$arrayfirst = array("tracking_status"=>'Order Placed',"place"=>$place,"date"=>$order_date);
			//$order->delivered = 'N'; 			
			//$order->Shipped = 'N'; 			
			//$order->packed = 'N'; 			
			//$order->accepted = 'N'; 			
			//$order->cancelled = 'N'; 			
			//$order->cancelled = 'Y'; 	
           
             if(($order->order_reference=='ANYTHINGINSTANTLYWEB' || $order->order_reference=='ANYTHINGINSTANTLYAPP' || $order->order_reference=='') && $order->order_reference!='POS'){
               
                if($order->delivered == 'Y'){
                    $order_status = 'Delivered';
                    $tracking_status = 'Delivered';
                    $date = $order->delivered_time;
                    
                 
                    $Accepted_tracking_status = 'Accepted by seller';
                    $accepted_time = $order->accepted_time;
                    
                    $array1 = array("tracking_status"=>$Accepted_tracking_status,"place"=>$place,"date"=>$accepted_time);
                    
                    $packed_tracking_status = 'Order Dispatched';
                    $packed_time = $order->packed_time;
                    
                    $array2 = array("tracking_status"=>$packed_tracking_status,"place"=>$place,"date"=>$packed_time);
                    
                    $Shipped_tracking_status = 'On the Way';
                    $Shipped_time = $order->Shipped_time;
                    
                    $array3 = array("tracking_status"=>$Shipped_tracking_status,"place"=>$place,"date"=>$Shipped_time);
                    
                    $Delivered_tracking_status = 'Delivered';
                    $delivered_time = $order->delivered_time;
                    
                    $array4 = array("tracking_status"=>$Delivered_tracking_status,"place"=>$place,"date"=>$delivered_time);
                    
                    $tracking_list_array = array($arrayfirst,$array1,$array2,$array3,$array4);
                    
                } else if($order->Shipped == 'Y'){
                    $order_status = 'On the Way';
                    $tracking_status = 'On the Way';
                    $date = $order->Shipped_time;
                    
                    $Accepted_tracking_status = 'Accepted by seller';
                    $accepted_time = $order->accepted_time;
                    
                    $array1 = array("tracking_status"=>$Accepted_tracking_status,"place"=>$place,"date"=>$accepted_time);
                    
                    $packed_tracking_status = 'Order Dispatched';
                    $packed_time = $order->packed_time;
                    
                    $array2 = array("tracking_status"=>$packed_tracking_status,"place"=>$place,"date"=>$packed_time);
                    
                    $Shipped_tracking_status = 'On the Way';
                    $Shipped_time = $order->Shipped_time;
                    
                    $array3 = array("tracking_status"=>$Shipped_tracking_status,"place"=>$place,"date"=>$Shipped_time);
                    
                    $tracking_list_array = array($arrayfirst,$array1,$array2,$array3);
                    
                
                } else if($order->packed == 'Y'){
                    $order_status = 'Order Dispatched';
                    $tracking_status = 'Order Dispatched';
                    $date = $order->packed_time;
                    
                    $Accepted_tracking_status = 'Accepted by seller';
                    $accepted_time = $order->accepted_time;
                    
                    $array1 = array("tracking_status"=>$Accepted_tracking_status,"place"=>$place,"date"=>$accepted_time);
                    
                    $packed_tracking_status = 'Order Dispatched';
                    $packed_time = $order->packed_time;
                    
                    $array2 = array("tracking_status"=>$packed_tracking_status,"place"=>$place,"date"=>$packed_time);
                    
                     
                    $tracking_list_array = array($arrayfirst,$array1,$array2);
                
                } else if($order->accepted == 'Y'){
                    $order_status = 'Accepted by seller';
                    $tracking_status = 'Accepted by seller';
                    $date = $order->accepted_time;
                    
                    $Accepted_tracking_status = 'Accepted by seller';
                    $accepted_time = $order->accepted_time;
                    
                    $array1 = array("tracking_status"=>$Accepted_tracking_status,"place"=>$place,"date"=>$accepted_time);
                    
                    $tracking_list_array = array($arrayfirst,$array1);
                
                } else if($order->cancelled == 'Y'){
                    $order_status = 'Cancelled';
                    $tracking_status = 'Cancelled';
                    $date = $order->cancelled_time;
                    
                    $cancelled_tracking_status = 'Cancelled';
                    $cancelled_time = $order->cancelled_time;
                    
                    $array1 = array("tracking_status"=>$cancelled_tracking_status,"place"=>$place,"date"=>$cancelled_time);
                    
                    if($order->refunded == 'Y') {
                        $refunded_tracking_status = 'Refunded';
                        $refunded_time = $order->refunded_time;
                        
                        $array2 = array("tracking_status"=>$refunded_tracking_status,"place"=>$place,"date"=>$refunded_time);
                                     
                        $tracking_list_array = array($arrayfirst,$array1,$array2);
                    
                    } else {
                        $tracking_list_array = array($arrayfirst,$array1);
                    }
                } /*else if($order->refunded == 'Y'){
                 
                    $order_status = 'Cancelled';
                    $tracking_status = 'Cancelled';
                    $date = $order->cancelled_time;
                    
                    $cancelled_tracking_status = 'Cancelled';
                    $cancelled_time = $order->cancelled_time;
                    
                    $array1 = array("tracking_status"=>$cancelled_tracking_status,"place"=>$place,"date"=>$cancelled_time);
                     
                    $order_status = 'Refunded';
                    $tracking_status = 'Refunded';
                    $date = $order->cancelled_time;
                    
                    $refunded_tracking_status = 'Refunded';
                    $refunded_time = $order->refunded_time;
                    
                    $array2 = array("tracking_status"=>$refunded_tracking_status,"place"=>$place,"date"=>$refunded_time);
                                  
                    $tracking_list_array = array($arrayfirst,$array1,$array2);
                    
                    
                } */ 
                else {
                    $order_status = 'Order Placed';
                    $tracking_status = 'Yet to accept by seller';
                    $date = $order->order_date;
            
                    $array1 = array("tracking_status"=>$tracking_status,"place"=>$place,"date"=>$date);
                    $tracking_list_array = array($arrayfirst);
                    
                }
                
            }else{
               
                //if($order->order_reference == 'POS'){
                      $order_status = 'Delivered';
                    $tracking_status = 'Delivered';
                     $date = $order->delivered_time;
                   /* 
                 
                    $Accepted_tracking_status = 'Accepted by seller';
                    $accepted_time = $order->accepted_time;
                    
                    $array1 = array("tracking_status"=>$Accepted_tracking_status,"place"=>$place,"date"=>$accepted_time);
                    
                    $packed_tracking_status = 'Order Dispatched';
                    $packed_time = $order->packed_time;
                    
                    $array2 = array("tracking_status"=>$packed_tracking_status,"place"=>$place,"date"=>$packed_time);
                    
                    $Shipped_tracking_status = 'On the Way';
                    $Shipped_time = $order->Shipped_time;
                    
                    $array3 = array("tracking_status"=>$Shipped_tracking_status,"place"=>$place,"date"=>$Shipped_time);
                    
                    $Delivered_tracking_status = 'Delivered';
                    $delivered_time = $order->delivered_time;
                    
                    $array4 = array("tracking_status"=>$Delivered_tracking_status,"place"=>$place,"date"=>$delivered_time);
                    
                    $tracking_list_array = array($arrayfirst,$array1,$array2,$array3,$array4);
                    */




                     $tracking_list_array = array(["tracking_status"=>'Completed',"place"=>$place,"date"=>$order_date]);
                    
                 }
          //  }

			$tracking_details=[];
			$tracking_details=$tracking_list_array;
			
			//getcoupon details
			if(isset($order->coupon_id)){ 
				$getCoupon = $cart->getCoupon($order->coupon_id);
			} else {
				$getCoupon = (object)[];
			}
			
			if(isset($order->calculated_orderMetaData)){ 
				
				
				
				$getOrderMetaJsonData = json_decode($order->calculated_orderMetaData);
				
				$i=0;
				$getOrderMetaData = array();
				foreach($getOrderMetaJsonData as $key=>$value){
					$getOrderMetaData[$key] = (double) $value;
				}
				
				//echo "<pre>"; print_r($getOrderMetaData); die;
			
			} else {
				$getOrderMetaData = (object)[];
			}
			
			 
			//$getOrderMetaData=$orderMetaData; 
		
			//$getOrderMetaData = (object)[];
            $driver_details=[];
			 
            if($order->accepted){  
			
				if($order->driver_id){
					$driver= new Driver();
					$driver_order_status_data = $driver->getDriverOrderStatus([ 'order_id'=>$order->id, 'driver_id'=>$order->driver_id ]);
					
					$driver_order_message=$driver_order_status_data['message'];
					$driver_order_status=$driver_order_status_data['driver_order_status'];
					
					if($driver_order_status == 1){
						$driver_order_status_text = 'Accepted'; 
					} else if($driver_order_status == 2){
						$driver_order_status_text = 'On The Way to Pickup'; 
					} else if($driver_order_status == 3){
						$driver_order_status_text = 'Picked up'; 
					} else if($driver_order_status == 8){
						$driver_order_status_text = 'Picked up'; 
					} else if($driver_order_status == 4){
						$driver_order_status_text = 'Reached at Store'; 
					} else if($driver_order_status == 5){
						$driver_order_status_text = 'On the way to deliver the order'; 
					} else if($driver_order_status == 6){
						$driver_order_status_text = 'Reached at location'; 
					} else if($driver_order_status == 7){
						$driver_order_status_text = 'Delivered'; 
 
						/*$Accepted_tracking_status = 'Driver Assigned';
						$accepted_time = $order->accepted_time;
						
						$array1 = array("tracking_status"=>$Accepted_tracking_status,"place"=>$place,"date"=>$accepted_time);
						
						$packed_tracking_status = 'Order Dispatched';
						$packed_time = $order->packed_time;
						
						$array2 = array("tracking_status"=>$packed_tracking_status,"place"=>$place,"date"=>$packed_time);
						
						$Shipped_tracking_status = 'On the Way';
						$Shipped_time = $order->Shipped_time;
						
						$array3 = array("tracking_status"=>$Shipped_tracking_status,"place"=>$place,"date"=>$Shipped_time);
						
						$Delivered_tracking_status = 'Delivered';
						$delivered_time = $order->delivered_time;
						
						$array4 = array("tracking_status"=>$Delivered_tracking_status,"place"=>$place,"date"=>$delivered_time);
						
						$tracking_list_array = array($arrayfirst,$array1,$array2,$array3,$array4);
						*/
					


					
					} else {
						$driver_order_status_text = 'Unknown';  
					}
					//$driver_order_status = $driver_order_status_text;
					 
				  
					$driver_details=[
						'driver_id'=>$order->driver_id,
						'driver_firstname'=>$order->driver_firstname,
						'driver_lastname'=>$order->driver_lastname,
						'driver_phone'=>$order->driver_phone,
						'driver_profile_img'=>$order->driver_profile_img,
						//'driver_status'=>$order->driver_status, 
						'driver_order_status'=>$driver_order_status_text, 
						'accepted'=>$order->accepted,
						'accepted_datetime'=>$order->accepted_datetime,
						'to_be_delivered_on'=>$order->to_be_delivered_on,
						'go_to_pickup'=>$order->go_to_pickup,
						'go_to_pickup_date_time'=>$order->go_to_pickup_date_time,
						'confirm_pickup'=>$order->confirm_pickup,
						'confirm_pickup_datetime'=>$order->confirm_pickup_datetime,
						'reached_at_store'=>$order->reached_at_store,
						'reached_at_store_date_time'=>$order->reached_at_store_date_time,
						'on_the_way_to_the_customer'=>$order->on_the_way_to_the_customer,
						'on_the_way_to_the_customer_date_time'=>$order->on_the_way_to_the_customer_date_time,
						'reached_at_customer_date_time'=>$order->reached_at_customer_date_time,
						'delivered'=>$order->delivered,
						'delivered_datetime'=>$order->delivered_datetime,
						'driver_note'=>$order->driver_note,
						'visible_drunk'=>$order->visible_drunk,
						'package_received_by'=>$order->package_received_by,
						'delivery_proof_file_name'=>$order->delivery_proof_file_name,
						'delivery_proof_file_path'=>$order->delivery_proof_file_path,
						'customer_signature_file_name'=>$order->customer_signature_file_name,
						'customer_signature_file_path'=>$order->customer_signature_file_path,

						'confirm_pickup_by_driver'=>$order->confirm_pickup_by_driver,
						'confirm_pickup_driver_datetime'=>$order->confirm_pickup_driver_datetime,
					];  
				} else {
					$driver_details = (object)[];
				}					
            } else { $driver_details = (object)[]; } 
            $order_data[]=array(
                'name'=>$order->name,
                'email'=>$order->email,
                'customer_id'=>$order->customer_id,
                'invoice_no'=>$order->invoice_no,
                'phone'=>$order->phone,
                'country'=>$order->country,
                'city'=>$order->city,
                'state'=>$order->state,
                'address'=>$order->address,
                'address_name'=>$order->address_name,
                'zip_code'=>$order->zip_code,
                'id'=>$order->id,
                'order_date'=>$order->order_date,
                'payment_id'=>$order->payment_id,
                'payment_status'=>$order->payment_status,
                'payment_method'=>$order->payment_method,
                'total_amount'=>$order->total_amount,
                'delivered'=>$order->delivered,
                'Shipped'=>$order->Shipped,
                'packed'=>$order->packed,
                'accepted'=>$order->accepted,
                'order_status'=>$order_status,
                'order_reference'=>$order->order_reference,
                'store_rating'=>$order->store_rating,
                'delivery_rating'=>$order->delivery_rating,
                'customer_message'=>$order->customer_message,
                'shipper_company_name'=>$order->shipper_company_name,
                'shipper_name'=>$order->shipper_name,
                'shipper_phone'=>$order->shipper_phone,
                'shipper_email'=>$order->shipper_email,
                'shipper_address'=>$order->shipper_address,
                'shipper_city'=>$order->shipper_city,
                'shipper_state'=>$order->shipper_state,
                'shipper_country'=>$order->shipper_country,
                'shipper_zipcode'=>$order->shipper_zipcode,
                'is_cancel_button'=>'N',
                'coupon_id'=>$order->coupon_id,
                'booking_id'=>$order->booking_id,
                'discounted_amount_after_coupon'=>$order->discounted_amount_after_coupon,
				'coupon_details'=>$getCoupon,
                'order_products'=>$this->getorderDetails(['op.order_id'=>$order->id]),
				'tracking_details'=>$tracking_details,
				'orderMetaData'=>$getOrderMetaData,
				
				'pickup'=>[
					'address'=>$order->shipper_address,
					'city'=>$order->shipper_city,
					'state'=>$order->shipper_state,
					'country'=>$order->shipper_country,
					'zip_code'=>$order->shipper_zipcode,
					'lat'=>$order->pickup_lat,
					'long'=>$order->pickup_long,
				],
				'drop_off'=>[
					'address'=>$order->address,
					'city'=>$order->city,
					'state'=>$order->state,
					'country'=>$order->country,
					'zip_code'=>$order->zip_code,
					'lat'=>$order->drop_lat,
					'long'=>$order->drop_long,
				],
                'driver_detail'=>$driver_details
             );
        }
      

        if(count($order_data)){
            return response()->json(
                [
                    'status'=>1,
                    'code'=>200,
                    'data'=>$order_data,
                    'aa'=>$options,
                    'message'=>'Order List!'
                ]
            );
        }else{
            return response()->json(
                [
                    'status'=>1,
                    'code'=>402,
                    'data'=>[],
                    'message'=>'No Order Found'
                ]
            );
        }
     }

     function customDate($post){
        $change_date=$post['change_date'];
        $today=date('d-m-Y');
        switch ($change_date){
    
         case 0:
         //today
         $from_date=$today;
         $to_date=$today;
         break;
    
         case 1:
         //yesterday
         $from_date=date('d-m-Y',strtotime("-1 days"));
         $to_date=date('d-m-Y',strtotime("-1 days"));
         break;
    
         case 2:
          //Last seven Days
         $from_date=date('d-m-Y',strtotime("-7 days"));
         $to_date=$today;
         break;
    
         case 3:
         //Last Fifteen days
         $from_date=date('d-m-Y',strtotime("-15 days"));
         $to_date=$today;
         break;
    
         case 4:
         //this month
         $from_date=date('01-m-Y');
         $to_date=$today;
         break;
    
         case 5:
         //last month
         $from_date=date('01-m-Y',strtotime('last month'));
         $to_date=date('t-m-Y',strtotime('last month'));
         break;
    
         case 6:
          //last six months
         $from_date=date('d-m-Y', strtotime(date('Y-m-d') .' -6 months'));
         $to_date=$today;
         break;
    
         case 7:
         //this year
         $from_date=date('01-01-Y');
         $to_date=$today;
         break;
    
         case 8:
         //Last Year
         $from_date=date("d-m-Y",strtotime("last year January 1st"));
         $to_date=date("d-m-Y",strtotime("last year December 31st"));
         break;
    
         case 9:
         $from_date=$post['from_date'] ? $post['from_date']:'01-01-1970';
         $to_date=$post['to_date'] ? $post['to_date']:$today;
         break;
    
         default :
         $from_date=$today;
         $to_date=$today;
         
        }
        $response['from_date']=$from_date;
        $response['to_date']=$to_date;
        return $response;
    }

    public function posManageSales(Request $request) {
        if(!empty($request->shipper_id)){
            $date['change_date']=$request->change_date;
            $custom_date=[];
            if($date['change_date']>-1){
                $custom_date=$this->customDate($date);
            }
 			$data=new Cart();
            $orderList=$data->posManageSales($request,$custom_date);
            if((array)$orderList){
                $response['data']= $orderList;
                $response['status'] = 1;
                $response['code'] = 200; 
                $response['message'] = "Sales List.";  
            }else{
                $response['data'] = (object)[];
                $response['status'] = 0;
                $response['code'] = 422;
                $response['message'] = "Data not found";
            }
		}else{
			$response['data']= (object)[];
			$response['status'] = 0;
			$response['code'] = 402; 
			$response['message'] = "Shipper ID is missing!";
		}
		return response()->json($response);
    }


    public function posManageAgents(Request $request) {
        if(!empty($request->shipper_id)){
 			$data=new Cart();
            $agentList=$data->posManageAgents($request);
            if((array)$agentList){
                $response['data']= $agentList;
                $response['status'] = 1;
                $response['code'] = 200; 
                $response['message'] = "Agent List.";  
            }else{
                $response['data'] = (object)[];
                $response['status'] = 0;
                $response['code'] = 422;
                $response['message'] = "Data not found";
            }
		}else{
			$response['data']= (object)[];
			$response['status'] = 0;
			$response['code'] = 402; 
			$response['message'] = "Shipper ID is missing!";
		}
		return response()->json($response);
    }

    public function posMoveCart(Request $request){
        $data=array(
            'user_id'=>$request->user_id,
            'new_user_id'=>$request->new_user_id,
        );
        $cart=new cart();
        $cart->destroyCart($request->new_user_id);
        $cart->posMoveCart($data);
        $response['data']= (object)[];
		$response['status'] = 1;
		$response['code'] = 200; 
		$response['message'] = "Cart moved successfully!";
        return response()->json($response);
    }

    public function fevrouteProducts(Request $request){
        $data=array(
            'shipper_id'=>$request->shipper_id,
            'category_id'=>$request->category_id,
        );
        $cart=new cart();
        $cart->fevrouteProducts($data);

    }
     public function getSales(Request $request){
        $where=[];
		if($request['shipper_id']>0){
			$where['so.shipper_id']=$request['shipper_id'];
		}
        if($request['customer_id']>0){
			$where['so.customer_id']=$request['customer_id'];
		}
        if($request['order_created_type']==1){
			$where['so.order_created_by_type']=$request['order_created_type'];
			$where['so.order_created_by_id']=$request['shipper_id'];
		}
		if($request['order_created_type']==2){
			$where['so.order_created_by_type']=$request['order_created_type'];
			$where['so.order_created_by_id']=$request['order_created_id'];
		}
        $date['change_date']=$request['change_date'];
        $custom_date=[];
        if($date['change_date']>-1){
            $custom_date=$this->customDate($date);
        }
        $sales=new cart();
        $sales_details=$sales->getSales($where,$custom_date);
        if($sales_details){
            return response()->json(
                [
                    'status'=>1,
                    'code'=>200,
                    'data'=>$sales_details,
                    'message'=>'Sales data'
                ]
            );
        }else{
            return response()->json(
                [
                    'status'=>0,
                    'code'=>402,
                    'data'=>$sales_details,
                    'message'=>'No Record Found'
                ]
            );
        }
        
     }
     public function getorderDetails($where){
        $cart=new cart();
        $response=array();
        $data=$cart->orderDetails($where);
        if(count($data)>0){
            foreach($data as $row){
                $title=$row->title;
                $show_title=$title;
                if(strlen($title)>35){
                    $show_title= substr($title,0,35).'...';
                }
				 
				if($row->parent_product_id > 0 || $row->parent_product_id != '') {
					$regex = "((https?|ftp)\:\/\/)?"; // SCHEME 
					$regex .= "([a-z0-9+!*(),;?&=\$_.-]+(\:[a-z0-9+!*(),;?&=\$_.-]+)?@)?"; // User and Pass 
					$regex .= "([a-z0-9-.]*)\.([a-z]{2,3})"; // Host or IP 
					$regex .= "(\:[0-9]{2,5})?"; // Port 
					$regex .= "(\/([a-z0-9+\$_-]\.?)+)*\/?"; // Path 
					$regex .= "(\?[a-z+&\$_.-][a-z0-9;:@&%=+\/\$_.-]*)?"; // GET Query 
					$regex .= "(#[a-z_.-][a-z0-9+\$_.-]*)?"; // Anchor 

					if(preg_match("/^$regex$/i", $row->qrcode_url)) // `i` flag for case-insensitive
					{ 
						$qrcode_path = $row->qrcode_url;
					} else {
						
						//const qrcode = new QRCode(document.getElementById('generateQrSpan_'+order_id+'_'+ai_product_id+''), {
						//text: ' '+order_id+' \u000A '+cust_name+' \u000A '+cust_email+' \u000A '+variation_category_name+' \u000A '+variation_name_value+' \u000A '+event_location+' \u000A '+event_date_time+' ',
						
						//if($row->qrcode_url)
						
						$qrcode_text = "asdasd : 123123 <br> asadaxzzz <br>"; 
						
						$qrimage = \QrCode::format('png')
						// ->merge('img/t.jpg', 0.1, true)
						 ->size(200)->errorCorrection('H')
						 ->generate($qrcode_text);
						 $storage_path = "public/qr-code/";
						 $filename = 'img-'. $row->order_id .'_' . $row->id .'_' . time() . '.png';
						$output_file = $storage_path.$filename;
						Storage::disk('local')->put($output_file, $qrimage); //storage/app/public/img/qr-code/img-1557309130.png
						
						$protocol = ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] != 'off') || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
						$url = $protocol . $_SERVER['HTTP_HOST'];
						
						$qrcode_path = $url.'/storage/qr-code/'.$filename;
						
						DB::table('wh_shipper_order_product')
								->where('id', $row->id) 
								->update( [ 'qrcode_url'=> $qrcode_path ] );
						
					}
				
				} else {
					$qrcode_path  = "";
				}
				//$getProductPrice = $cart->getProductPrice($row->price,$row->discount);
						
				//$product_price = $getProductPrice['product_price'];
				//$discounted_price = $getProductPrice['discounted_price'];
				
                $response[]=array(
                    'id'=>$row->id,
                    'order_id'=>$row->order_id,
                    'product_id'=>$row->product_id,
                    'title'=>$row->title,
                    'image'=>$row->image,
                    'quantity'=>$row->quantity,
                    'price'=>$row->price,
                    'total_price'=>$row->total_price,
                    //'weight'=>$row->weight,
                    'weight'=>"",
                    'discount'=>$row->discount,
                    'discounted_price'=>$row->discounted_price,
                    'total_discounted_price'=>$row->total_discounted_price,
                    'ai_category_id'=>$row->ai_category_id,
                    'product_variation'=>$row->product_variation,
                    'variation_type'=>$row->variation_type,
                    'parent_product_id'=>$row->parent_product_id,
                    'variation_category_name'=>$row->variation_category_name,
                    'variation_name_value'=>$row->variation_name_value,
                    'event_name'=>$row->variation_category_name . '-' .$row->variation_name_value,
                    'event_location'=>$row->event_location,
                    'event_date_time'=>$row->event_date_time,
                    'ai_category_name'=>$row->ai_category_name,
                    'qrCode'=>$qrcode_path,
                     
                    'show_title'=>$show_title,
                    'product_link'=>$row->product_id.'-'.preg_replace('/[^A-Za-z0-9\-]/', '', str_replace(" ","-",$row->title)),
                );

            }  
        }
        return $response;
     }
	 
	 
	 
	 
     public function viewCustomerProfile(Request $request){
        if(empty($request->id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer ID is missing!'];
            return response()->json($response);
        }
        $cart=new cart();
        $data=['u.id'=>$request->id];
        $user_profile=$cart->viewCustomerProfile($data);
        if($user_profile){
            return response()->json(['status'=>1,'code'=>200,'data'=>$user_profile,'message'=>'Customer Profile!']);
        }else{
            return response()->json(['status'=>0,'code'=>402,'data'=>$user_profile,'message'=>'No Detail Found!']);
        }
     }
     public function updateCustomerProfile(Request $request){
        if(empty($request->id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer ID is missing!'];
            return response()->json($response);
        }
        if(empty($request->name)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer Name is missing!'];
            return response()->json($response);
        }
        if(empty($request->country)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer Country is missing!'];
            return response()->json($response);
        }

        if(empty($request->city)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer City is missing!'];
            return response()->json($response);
        }

        if(empty($request->state)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer State is missing!'];
            return response()->json($response);
        }

        if(empty($request->address)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer Address is missing!'];
            return response()->json($response);
        }

        if(empty($request->zipcode)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer Zip Code is missing!'];
            return response()->json($response);
        }
        $data=array(
            'id'=>$request->id,
            'name'=>$request->name,
            'country'=>$request->country,
            'city'=>$request->city,
            'state'=>$request->state,
            'address'=>$request->address,
            'zipcode'=>$request->zipcode,
        );
        $cart=new cart();
        $user_profile=$cart->updateCustomerProfile($data);
        if($user_profile){
            $response= ['status'=>1,'code'=>200,'data'=>$user_profile,'message'=>'Your Profile has been updated successfully!'];
            return response()->json($response);
        }else{
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Something went wrong!'];
            return response()->json($response);
        }
     }

     function updateCustomerData(Request $request){
        if(empty($request->user_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer ID is missing!'];
            return response()->json($response);
        }
        if(empty($request->key)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Your choice is missing!'];
            return response()->json($response);
        }else{
            if($request->key=='phone'){
                if(empty($request->country_code)){
                    $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Country Code is missing!'];
                    return response()->json($response);
                }else{
                    if($request->country_code=='+91' || $request->country_code=='+1'){
                    }else{
                        $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Invalid Country Code!'];
                        return response()->json($response);
                    }
                }
            }
        }
        
        if(empty($request->value)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>$request->key.' is missing!'];
            return response()->json($response);
        }
          $add_update_data=array(
            'user_id'=>$request->user_id,
            'key'=>$request->key,
            'value'=>$request->value,
            'country_code'=>$request->country_code?$request->country_code:'',
            'otp'=>rand(100000,999999),
        );
        $cart=new cart();
        $response=$cart->updateCustomerData($add_update_data);
        if($response['status']){
            if($add_update_data['key']=='phone'){
                $message = "is your one time verification code for update phone number in  Anything Instantly";
                $this->sendSMS($add_update_data['country_code'].' '.$add_update_data['value'],$add_update_data['otp'],$message);
             }else if($add_update_data['key']=='email'){
                $mail_message='
            <html>
                <body><h3>Hey there,</h3>
                    <p>Seems like you have changed your email address on Anything Instantly.</p>
                    <p>Please use the below OTP to verify it'."'".'s you :)</p>
                    <p>Here is your One Time Password -<b>'.$add_update_data['otp'].'</b></p>
                    <p>Please ignore this email if you did not request to reset your email.</p>
                    <div>Regards<br>Anything Instantly</div>
                </body>
            </html>';
        $email=array($add_update_data['value']);
        $from_arr=[
            'name' => 'Team Anything Instantly',
            'email' => 'info@shipting.com',  
        ];
        $subject="Verify it's you :)";
        $this->sendmail($email,$from_arr,$subject,$mail_message);
            }
        }
        return response()->json($response); 
     }
    
     function updateProductCartQuantity(Request $request){
        if(empty($request->user_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer ID is missing!'];
            return response()->json($response);
        }
        if(empty($request->quantity)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Product Quantity is missing!'];
            return response()->json($response);
        }
        if(empty($request->cart_detail_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Cart Item ID is missing!'];
            return response()->json($response);
        }
  		$add_update_data=array(
            'user_id'=>$request->user_id,
            'coupon_id'=>$request->coupon_id,
            'quantity'=>$request->quantity,
            'order_origin'=>$request->order_origin?$request->order_origin:'',
            'cart_detail_id'=>$request->cart_detail_id,
        );
        $cart=new cart();
        $response=$cart->updateProductCartQuantity($add_update_data);
        return response()->json($response);        
 	}

     function customerRegistration(Request $request){
        if(empty($request->name)){
            $response= ['status'=>0,'code'=>402,'data'=>[],'message'=>'Name is missing.'];
            return response()->json($response);
        }
        if(empty($request->email)){
            $response= ['status'=>0,'code'=>402,'data'=>[],'message'=>'Email is missing.'];
            return response()->json($response);
        }
        if(empty($request->phone)){
            $response= ['status'=>0,'code'=>402,'data'=>[],'message'=>'Phone is missing.'];
            return response()->json($response);
        }
        if(empty($request->password)){
            $response= ['status'=>0,'code'=>402,'data'=>[],'message'=>'Password is missing.'];
            return response()->json($response);
        }
		if(empty($request->referred_code)){
			$referred_code = "";
        } else {
			$referred_code = $request->referred_code;
			
			$query= DB::table('ai_users AS u');
			 
			$query->select( 'u.id', 'u.referral_code', 'u.referral_prize' );
			$query->where([['u.referral_code', '=', $referred_code]]);
			 
			$getReferralCode = $query->get()->first();
			 
			if(isset($getReferralCode->id)) {
				 
				//$data = array("referral_user_id"=>$getReferralCode->id,"referral_code"=>$referred_code,"referral_prize"=>$getReferralCode->referral_prize);
				
				//return ['status'=>1,'code'=>200,'data'=>$data,'message'=>'Referral code works'];
				
			} else {
				return ['status'=>0,'code'=>402,'message'=>'Referral code is not correct'];
			}
			
		}
        $add_update_data=array(
            'name'=>$request->name,
            'email'=>$request->email,
            'country_code'=>$request->country_code,
            'phone'=>$request->phone,
            'referred_code'=>$referred_code,
            'password'=>sha1($request->password),
            'otp'=>rand(100000,999999),
        );
        $cart=new cart();
        $response=$cart->customerRegistration($add_update_data);
        if($response['status']){
            $response['code']=200;
            $message = "is your one time verification code for Anything Instantly Registration";
            $this->sendSMS($add_update_data['country_code'].' '.$add_update_data['phone'],$add_update_data['otp'],$message);
        }else{
  			$response['code'] = 402; 
        }
        return response()->json($response);
    }
    public function sendSMS($mobile,$otp,$message){
 
	 

	    }

    function customerEmailVerification(Request $request){
        if(empty($request->email)){
            $response= ['status'=>0,'code'=>402,'data'=>[],'message'=>'Email is missing.'];
            return response()->json($response);
        }
        if(empty($request->otp)){
            $response= ['status'=>0,'code'=>402,'data'=>[],'message'=>'OTP is missing.'];
            return response()->json($response);
        }
        $data=array(
            'email'=>$request->email,
            'otp'=>$request->otp,
        );
        $cart=new cart();
        $response=$cart->customerEmailVerification($data);
        return response()->json($response);
    }

    function customerEmailVerificationForUpdate(Request $request){
        if(empty($request->email)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Email is missing.'];
            return response()->json($response);
        }
        if(empty($request->otp)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'OTP is missing.'];
            return response()->json($response);
        }
        $data=array(
            'email'=>$request->email,
            'otp'=>$request->otp,
        );
        $cart=new cart();
        $response=$cart->customerEmailVerificationForUpdate($data);
        return response()->json($response);
    }

    function customerPhoneVerificationForUpdate(Request $request){
        if(empty($request->phone)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Phone is missing.'];
            return response()->json($response);
        }
        if(empty($request->otp)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'OTP is missing.'];
            return response()->json($response);
        }
        $data=array(
            'phone'=>$request->phone,
            'otp'=>$request->otp,
        );
        $cart=new cart();
        $response=$cart->customerPhoneVerificationForUpdate($data);
        return response()->json($response);
    }

    function customerEmailCheckOtp(Request $request){
        if(empty($request->email)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Email is missing.'];
            return response()->json($response);
        }
        if(empty($request->otp)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'OTP is missing.'];
            return response()->json($response);
        }
        $data=array(
            'email'=>$request->email,
            'otp'=>$request->otp,
        );
        $cart=new cart();
        $response=$cart->customerEmailCheckOtp($data);
        return response()->json($response);
    }
    function customerPhoneCheckOtp(Request $request){
        if(empty($request->phone)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Phone is missing.'];
            return response()->json($response);
        }
        if(empty($request->otp)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'OTP is missing.'];
            return response()->json($response);
        }
        $data=array(
            'phone'=>$request->phone,
            'otp'=>$request->otp,
        );
        $cart=new cart();
        $response=$cart->customerPhoneCheckOtp($data);
        return response()->json($response);
    }
    function deleteCustomerAccount(Request $request){
        if(empty($request->id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer ID is missing.'];
            return response()->json($response);
        }
        $cart=new cart();
        $response=$cart->deleteCustomerAccount(['id'=>$request->id]);
        return response()->json($response);
    }
    
    function customerEmailSentOtp(Request $request){
        if(empty($request->email)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Email is missing.'];
            return response()->json($response);
        }
        $data=array(
            'email'=>$request->email,
            'otp'=>rand(100000,999999),
        );
        $cart=new cart();
        $response=$cart->customerEmailSentOtp($data);
        if($response['status']){
            $mail_message='
            <html>
                <body>
                    <h3>Oops! Forgot your password?<b></b></h3>
                    <p>No problem!</p>
                    <p>Use the OTP below to set up a new password for your account.</p>
                    <p>Here is your One Time Password (OTP) - <b>'.$data['otp'].'</b></p>
                    <p>Please ignore this email if you did not request to reset your password.</p>
                    <div>Regards</div>
                    <div>Anything Instantly</div>
                </body>
            </html>';
        $email=array($request->email);
        //$from_arr=Config::get('constants.anythingInstantly');
        $from_arr=[
            'name' => 'Team Anything Instantly',
            'email' => 'info@shipting.com',  
        ];
        $subject='AnythingInstantly - Forgot Password';
        $this->sendmail($email,$from_arr,$subject,$mail_message);
        $cart->updateUserDetails(['id'=>$response['id'],'email_verification_otp'=>$data['otp']]);
        }
        return response()->json($response);
    }

    function customerEmailverificationResendOtp(Request $request){
        if(empty($request->email)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Email is missing.'];
            return response()->json($response);
        }
        $data=array(
            'email'=>$request->email,
            'otp'=>rand(100000,999999),
        );
        $cart=new cart();
        $response=$cart->customerEmailverificationResendOtp($data);
        if($response['status']){
            $mail_message='
            <!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf8">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>Email Verification</title>

</head>
<body lang="en" style="margin: 0; padding: 0; width: 100%; word-break: break-word; -webkit-font-smoothing: antialiased; background-color: #ffffff;">
<table class="wrapper" style="width: 100%;font-family: -apple-system, sans-serif !important;" cellpadding="0" cellspacing="0" role="presentation">
  <tr>
    <td align="left" style bgcolor="#ffffff">
      <table class="sm-w-full" style="width: 640px;" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td class="sm-px-16 sm-py-24" style="padding-left: 40px; padding-right: 40px; padding-top: 48px; padding-bottom: 48px; text-align: left;" bgcolor="#ffffff" align="left">
            <div style="text-align:center">
              <a href="https://anythinginstantly.com" style="color: #0047c3; text-decoration: none;">
                <img src="https://anythinginstantly.com/photo/logo.png" alt="anythinginstantly" width="250" style="line-height: 100%; vertical-align: middle; border: 0;">
              </a>
            </div>                    
			<div style="background-color: #d4d4d9; height: 0.5px; line-height: 1px;margin:22px 0px;">&nbsp;</div>

            <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;"><b>Hello '.$response['name'].',</b> </p>
			            <div class="" style="line-height: 16px;">&nbsp;</div>			
			
            <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">
				Glad you chose Anything Instantly, we are really excited to work for you!
				But first, let’s get your account verified :)</p>
		
			<div class="" style="line-height: 16px;">&nbsp;</div>
			<p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">Here is your Unique OTP '.$data['otp'].'</p>
			<div class="" style="line-height: 16px;">&nbsp;</div>
			<p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">Please use this one-time code to verify your account, explore the wide range of daily essentials, and get them at your doorstep in minutes.</p>
			<div class="" style="line-height: 16px;">&nbsp;</div>
			<p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">Looking forward to your order</br>
				Anything Instantly</p>
            <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">
				Anything Instantly</p>
		
			

            <div class="" style="line-height: 16px;">&nbsp;</div>
			<div style="text-align: left;">
				<table style="width: 100%;" cellpadding="0" cellspacing="0" role="presentation">
				
				  <tr>
					<td style="padding-bottom: 16px; padding-top: 16px;">
					  <div style="background-color: #d4d4d9; height: 0.5px; line-height: 1px;">&nbsp;</div>
					</td>
				  </tr>
				  <tr>
					  <td align="center" dir="ltr" valign="top" style="padding:0 24px 0 24px">
					  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation">
					  <tbody><tr>
  
					  <td align="center" valign="top" width="20" style="width:20px">
					  &nbsp;
					  </td>
					  <td align="center" valign="top">
					  <table align="center" valign="top" cellspacing="0" cellpadding="0" role="presentation">
					  <tbody><tr>
					  <td align="center" valign="top"><a href="https://www.instagram.com/__anythinginstantly__/" style="text-decoration:none" target="_blank"><img src="https://anythinginstantly.com/image/instagram-48.png" width="33" height="auto" style="padding:11px 8px;width:33px;height:auto;display:block" border="0" title="Follow YouTube Creators on Instagram " alt="Follow YouTube Creators on Instagram " class="CToWUd" data-bit="iit"></a></td>
					  </tr>
					  </tbody></table>
					  </td>
					  <td align="center" valign="top">
					  <table align="center" valign="top" cellspacing="0" cellpadding="0" role="presentation">
					  <tbody><tr>
					  <td align="center" valign="top"><a href="https://www.facebook.com/people/Anything-Instantly/100084401683757/" style="text-decoration:none" target="_blank"><img src="https://anythinginstantly.com/image/facebook-48.png" width="33" height="auto" style="padding:11px 8px;width:33px;height:auto;display:block" border="0" title="Follow YouTube Creators on facebook " alt="Follow YouTube Creators on facebook " class="CToWUd" data-bit="iit"></a></td>
					  </tr>
					  </tbody></table>
					  </td>
					  </tr>
					  </tbody></table>
					  </td>
					  </tr>
				</table>
				<p style="line-height: 16px; margin: 0; color: #8492a6; font-size: 12px;text-align: center;">&copy; 2024 AnythingInstantly. All rights reserved.</p>
			  </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>';
        $email=array($request->email);
        $from_arr=[
            'name' => 'Team Anything Instantly',
            'email' => 'info@shipting.com',  
        ];
        $subject='AnythingInstantly - Email Verification';
        $this->sendmail($email,$from_arr,$subject,$mail_message);
        $cart->updateUserDetails(['id'=>$response['id'],'email_verification_otp'=>$data['otp']]);
        }
        $response['email_body']=$mail_message;
        return response()->json($response);
    }


    function customerEmailSentOtpForVerification(Request $request){
        if(empty($request->email)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Email is missing.'];
            return response()->json($response);
        }
        $data=array(
            'email'=>$request->email,
            'otp'=>rand(100000,999999),
        );
        $cart=new cart();
        $response=$cart->customerEmailSentOtp($data);
        if($response['status']){
            $mail_message='
            <!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf8">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>Email Verification</title>

</head>
<body lang="en" style="margin: 0; padding: 0; width: 100%; word-break: break-word; -webkit-font-smoothing: antialiased; background-color: #ffffff;">
<table class="wrapper" style="width: 100%;font-family: -apple-system, sans-serif !important;" cellpadding="0" cellspacing="0" role="presentation">
  <tr>
    <td align="left" style bgcolor="#ffffff">
      <table class="sm-w-full" style="width: 640px;" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td class="sm-px-16 sm-py-24" style="padding-left: 40px; padding-right: 40px; padding-top: 48px; padding-bottom: 48px; text-align: left;" bgcolor="#ffffff" align="left">
            <div style="text-align:center">
              <a href="https://anythinginstantly.com" style="color: #0047c3; text-decoration: none;">
                <img src="https://anythinginstantly.com/photo/logo.png" alt="anythinginstantly" width="250" style="line-height: 100%; vertical-align: middle; border: 0;">
              </a>
            </div>                    
			<div style="background-color: #d4d4d9; height: 0.5px; line-height: 1px;margin:22px 0px;">&nbsp;</div>

            <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;"><b>Hello '.$response['name'].',</b></p>
			            <div class="" style="line-height: 16px;">&nbsp;</div>			
			
            <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">
				Glad you chose Anything Instantly, we are really excited to work for you!
				But first, let’s get your account verified :)</p>
		
			<div class="" style="line-height: 16px;">&nbsp;</div>
			<p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">Here is your Unique OTP '.$data['otp'].'</p>
			<div class="" style="line-height: 16px;">&nbsp;</div>
			<p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">Please use this one-time code to verify your account, explore the wide range of daily essentials, and get them at your doorstep in minutes.</p>
			<div class="" style="line-height: 16px;">&nbsp;</div>
			<p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">Looking forward to your order</p>
            <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">
				Anything Instantly</p>
		
			

            <div class="" style="line-height: 16px;">&nbsp;</div>
			<div style="text-align: left;">
				<table style="width: 100%;" cellpadding="0" cellspacing="0" role="presentation">
				
				  <tr>
					<td style="padding-bottom: 16px; padding-top: 16px;">
					  <div style="background-color: #d4d4d9; height: 0.5px; line-height: 1px;">&nbsp;</div>
					</td>
				  </tr>
				  <tr>
					  <td align="center" dir="ltr" valign="top" style="padding:0 24px 0 24px">
					  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation">
					  <tbody><tr>
  
					  <td align="center" valign="top" width="20" style="width:20px">
					  &nbsp;
					  </td>
					  <td align="center" valign="top">
					  <table align="center" valign="top" cellspacing="0" cellpadding="0" role="presentation">
					  <tbody><tr>
					  <td align="center" valign="top"><a href="https://www.instagram.com/__anythinginstantly__/" style="text-decoration:none" target="_blank"><img src="https://anythinginstantly.com/image/instagram-48.png" width="33" height="auto" style="padding:11px 8px;width:33px;height:auto;display:block" border="0" title="Follow YouTube Creators on Instagram " alt="Follow YouTube Creators on Instagram " class="CToWUd" data-bit="iit"></a></td>
					  </tr>
					  </tbody></table>
					  </td>
					  <td align="center" valign="top">
					  <table align="center" valign="top" cellspacing="0" cellpadding="0" role="presentation">
					  <tbody><tr>
					  <td align="center" valign="top"><a href="https://www.facebook.com/people/Anything-Instantly/100084401683757/" style="text-decoration:none" target="_blank"><img src="https://anythinginstantly.com/image/facebook-48.png" width="33" height="auto" style="padding:11px 8px;width:33px;height:auto;display:block" border="0" title="Follow YouTube Creators on facebook " alt="Follow YouTube Creators on facebook " class="CToWUd" data-bit="iit"></a></td>
					  </tr>
					  </tbody></table>
					  </td>
					  </tr>
					  </tbody></table>
					  </td>
					  </tr>
				</table>
				<p style="line-height: 16px; margin: 0; color: #8492a6; font-size: 12px;text-align: center;">&copy; 2024 AnythingInstantly. All rights reserved.</p>
			  </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>';
        $email=array($request->email);
        //$from_arr=Config::get('constants.anythingInstantly');
        $from_arr=[
            'name' => 'Team Anything Instantly',
            'email' => 'info@shipting.com',  
        ];
        $subject='AnythingInstantly - Email Verification';
        $this->sendmail($email,$from_arr,$subject,$mail_message);
        $cart->updateUserDetails(['id'=>$response['id'],'email_verification_otp'=>$data['otp']]);
        }
        $response['email_body']=$mail_message;
        return response()->json($response);
    }
    
    function customerPhoneResendOtp(Request $request){
        if(empty($request->phone)){
            $response= ['status'=>0,'code'=>402,'data'=>[],'message'=>'Phone is missing.'];
            return response()->json($response);
        }
        $data=array(
            'phone'=>$request->phone,
            'otp'=>rand(100000,999999),
        );
        $cart=new cart();
        $response=$cart->customerPhoneResendOtp($data);
        if($response['status']){
            $message = "is your one time verification code for Anything Instantly Verification";
            $this->sendSMS($response['country_code'].' '.$data['phone'],$data['otp'],$message);
        }
        return response()->json($response);
    }
    function customerPhoneVerification(Request $request){
        if(empty($request->phone)){
            $response= ['status'=>0,'code'=>402,'data'=>[],'message'=>'Phone is missing.'];
            return response()->json($response);
        }
        if(empty($request->otp)){
            $response= ['status'=>0,'code'=>402,'data'=>[],'message'=>'OTP is missing.'];
            return response()->json($response);
        }
        $data=array(
            'phone'=>$request->phone,
            'otp'=>$request->otp,
        );
        $cart=new cart();
        $response=$cart->customerPhoneVerification($data);
        if($response['status']){
            $mail_template='<!DOCTYPE html>
            <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
            <head>
              <meta charset="utf8">
              <meta http-equiv="x-ua-compatible" content="ie=edge">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <meta name="x-apple-disable-message-reformatting">
              <title>Welcome Email!</title>
            </head>
            <body lang="en" style="margin: 0; padding: 0; width: 100%; word-break: break-word; -webkit-font-smoothing: antialiased; background-color: #ffffff;">
            <table class="wrapper" style="width: 100%;font-family: -apple-system, Segoe UI, sans-serif !important;" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td align="left" style bgcolor="#ffffff">
                  <table class="sm-w-full" style="width: 640px;" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td class="sm-px-16 sm-py-24" style="padding-left: 40px; padding-right: 40px; padding-top: 48px; padding-bottom: 48px; text-align: center;" bgcolor="#ffffff" align="left">
                        <div>
                          <a href="https://anythinginstantly.com" style="color: #0047c3; text-decoration: none;">
                            <img src="https://anythinginstantly.com/photo/logo.png" alt="anythinginstantly" width="250" style="line-height: 100%; vertical-align: middle; border: 0;">
                          </a>
                        </div>                    
                        <div style="background-color: #d4d4d9; height: 0.5px; line-height: 1px;margin:22px 0px;">&nbsp;</div>
            
            
                        <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;"><b>Welcome</b> '.$response['data']['name'].' 👋</p>
                                    <div class="sm-h-16" style="line-height: 16px;">&nbsp;</div>
            
                        <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;text-align: left;">We are so excited that you chose <b>Anything Instantly</b> 🤩</p>
                        <div class="sm-h-16" style="line-height: 16px;">&nbsp;</div>
                        <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;text-align: left;">We swear by our name and promise to Deliver “Anything” Instantly. Anything Instantly is a convenient delivery service that’ll bring all your daily essentials to your home in minutes.</p>
                        <div class="sm-h-16" style="line-height: 16px;">&nbsp;</div>
                        <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;text-align: left;">What else? 
                        We also have a Scan-n-Sell feature where you can almost sell anything and everything from extra beers to daily essentials.</p>
                        <div class="sm-h-16" style="line-height: 16px;">&nbsp;</div>
                        
                        <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;text-align: left;"><b>Explore now!</b></p>
                        
                        <div class="sm-h-16" style="line-height: 16px;">&nbsp;</div>
                        <p style="margin:0;line-height:1.5;word-break:break-word;margin-top:0;margin-bottom:0">&nbsp;</p>
                        <table class="sm-w-full" cellpadding="0" cellspacing="0" role="presentation" align="center">
                          <tr>
                            <td align="center" class="hover-bg-brand-600" style="mso-padding-alt: 20px 32px; border-radius: 4px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, .1), 0 1px 2px 0 rgba(0, 0, 0, .06); color: #ffffff;" bgcolor="#7FB244">
                              <a href="https://anythinginstantly.com" class="sm-text-14 sm-py-16" style="display: inline-block; font-weight: 700; line-height: 16px; padding-top: 20px; padding-bottom: 20px; padding-left: 32px; padding-right: 32px; color: #ffffff; font-size: 16px; text-decoration: none;">Sign in to your account</a>
                            </td>
                          </tr>
                        </table>
                        <div class="sm-h-16" style="line-height: 16px;">&nbsp;</div>
                                    <div style="text-align: left;">
                          <table style="width: 100%;" cellpadding="0" cellspacing="0" role="presentation">
                          
                            <tr>
                              <td style="padding-bottom: 16px; padding-top: 16px;">
                                <div style="background-color: #d4d4d9; height: 0.5px; line-height: 1px;">&nbsp;</div>
                              </td>
                            </tr>
                            <tr>
                                <td align="center" dir="ltr" valign="top" style="padding:0 24px 0 24px">
                                <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                <tbody><tr>
            
                                <td align="center" valign="top" width="20" style="width:20px">
                                &nbsp;
                                </td>
                                <td align="center" valign="top">
                                <table align="center" valign="top" cellspacing="0" cellpadding="0" role="presentation">
                                <tbody><tr>
                                <td align="center" valign="top"><a href="https://www.instagram.com/__anythinginstantly__/" style="text-decoration:none" target="_blank"><img src="http://anythinginstantly.com/image/instagram-48.png" width="33" height="auto" style="padding:11px 8px;width:33px;height:auto;display:block" border="0" title="Follow YouTube Creators on Instagram " alt="Follow YouTube Creators on Instagram " class="CToWUd" data-bit="iit"></a></td>
                                </tr>
                                </tbody></table>
                                </td>
                                <td align="center" valign="top">
                                <table align="center" valign="top" cellspacing="0" cellpadding="0" role="presentation">
                                <tbody><tr>
                                <td align="center" valign="top"><a href="https://www.facebook.com/people/Anything-Instantly/100084401683757/" style="text-decoration:none" target="_blank"><img src="http://anythinginstantly.com/image/facebook-48.png" width="33" height="auto" style="padding:11px 8px;width:33px;height:auto;display:block" border="0" title="Follow YouTube Creators on facebook " alt="Follow YouTube Creators on facebook " class="CToWUd" data-bit="iit"></a></td>
                                </tr>
                                </tbody></table>
                                </td>
                                </tr>
                                </tbody></table>
                                </td>
                                </tr>
                          </table>
                          <p style="line-height: 16px; margin: 0; color: #8492a6; font-size: 12px;text-align: center;">&copy; 2024 AnythingInstantly. All rights reserved.</p>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            </body>
            </html>';
            $email=array($response['data']['email']);
            $from_arr=[
            'name' => 'Team Anything Instantly',
            'email' => 'info@shipting.com',  
            ];
            $subject='Anything Instantly- Welcome Email';
            $this->sendmail($email,$from_arr,$subject,$mail_template);
        }
        return response()->json($response);
    }

    function customerLogin(Request $request){
        if(empty($request->email)){
            $response= ['status'=>0,'code'=>402,'data'=>[],'message'=>'Email is missing.'];
            return response()->json($response);
        }
        if(empty($request->password)){
            $response= ['status'=>0,'code'=>402,'data'=>[],'message'=>'Password is missing.'];
            return response()->json($response);
        }
		
		if(empty($request->androidDeviceToken)){
			$androidDeviceToken = $request->androidDeviceToken;
            
        } else {
			$androidDeviceToken = "";
		}
		
		if(empty($request->iosDeviceToken)){
			$iosDeviceToken = $request->iosDeviceToken;
            
        } else {
			$iosDeviceToken = "";
		}
		
        $data=array(
            'androidDeviceToken'=>$androidDeviceToken,
            'iosDeviceToken'=>$iosDeviceToken,
            'email'=>$request->email,
            'password'=>sha1($request->password),
        );
        $cart=new cart();
        $response=$cart->customerLogin($data);
        return response()->json($response);
    }

    function customerPhoneLogin(Request $request){
        if(empty($request->phone)){
            $response= ['status'=>0,'code'=>402,'data'=>[],'message'=>'Phone is missing.'];
            return response()->json($response);
        }
        if(empty($request->password)){
            $response= ['status'=>0,'code'=>402,'data'=>[],'message'=>'Password is missing.'];
            return response()->json($response);
        }
       
		if(empty($request->androidDeviceToken)){
			$androidDeviceToken = "";
            
        } else {
			$androidDeviceToken = $request->androidDeviceToken;
		}
		
		if(empty($request->iosDeviceToken)){
			$iosDeviceToken = "";
            
        } else {
			$iosDeviceToken = $request->iosDeviceToken;
		}
	  
		 $data=array(
            'phone'=>$request->phone,
            'password'=>sha1($request->password),
			'androidDeviceToken'=>$androidDeviceToken,
            'iosDeviceToken'=>$iosDeviceToken,
        );
		
		
        $cart=new cart();
        $response=$cart->customerPhoneLogin($data);
        if(!$response['status'] && $response['case']==1){
            $request_data=array(
                'phone'=>$request->phone,
                'otp'=>rand(100000,999999),
            );
            $new_response=$cart->customerPhoneResendOtp($request_data);
            if($new_response['status']){
                $message = "is your one time verification code for Anything Instantly Verification";
                $this->sendSMS($new_response['country_code'].' '.$request_data['phone'],$request_data['otp'],$message);
            }
        }
        return response()->json($response);
    }
    
    function customerResetPassword(Request $request){
        if(empty($request->email)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Email is missing.'];
            return response()->json($response);
        }
        if(empty($request->password)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Password is missing.'];
            return response()->json($response);
        }
        $data=array(
            'email'=>$request->email,
            'password'=>sha1($request->password),
        );
        $cart=new cart();
        $response=$cart->customerResetPassword($data);
        return response()->json($response);
    }

    function customerResetPhonePassword(Request $request){
        if(empty($request->phone)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Phone is missing.'];
            return response()->json($response);
        }
        if(empty($request->password)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Password is missing.'];
            return response()->json($response);
        }
        $data=array(
            'phone'=>$request->phone,
            'password'=>sha1($request->password),
        );
        $cart=new cart();
        $response=$cart->customerResetPhonePassword($data);
        if($response['status']){
            $mail_template='<!DOCTYPE html>
            <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
            <head>
              <meta charset="utf8">
              <meta http-equiv="x-ua-compatible" content="ie=edge">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <meta name="x-apple-disable-message-reformatting">
              <title>Reset password confirmation</title>
            
            </head>
            <body lang="en" style="margin: 0; padding: 0; width: 100%; word-break: break-word; -webkit-font-smoothing: antialiased; background-color: #ffffff;">
            <table class="wrapper" style="width: 100%;font-family: -apple-system, sans-serif !important;" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td align="center" style bgcolor="#ffffff">
                  <table class="sm-w-full" style="width: 640px;" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td class="sm-px-16 sm-py-24" style="padding-left: 40px; padding-right: 40px; padding-top: 48px; padding-bottom: 48px; text-align: left;" bgcolor="#ffffff" align="left">
                        <div style="text-align:center">
                          <a href="https://anythinginstantly.com" style="color: #0047c3; text-decoration: none;">
                            <img src="https://anythinginstantly.com/photo/logo.png" alt="anythinginstantly" width="250" style="line-height: 100%; vertical-align: middle; border: 0;">
                          </a>
                        </div>                    
                        <div style="background-color: #d4d4d9; height: 0.5px; line-height: 1px;margin:22px 0px;">&nbsp;</div>
            
                        <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;"><b>Hello '.$response['data']['name'].',</b></p>
                                    <div class="" style="line-height: 16px;">&nbsp;</div>			
                        
                        <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">
                            This is a confirmation email that you have successfully reset your password</p>
                    
                        <div class="" style="line-height: 16px;">&nbsp;</div>
                        <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">Glad you chose Anything Instantly, we are really excited to work for you!</p>
                        <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">Explore the wide range of daily essentials, and get them at your doorstep in minutes.</p>
                        <div class="" style="line-height: 16px;">&nbsp;</div>
                        <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">If you did not reset your password  kindly write us on Support@anythinginstantly.com</br></p>
                    
                        <div class="" style="line-height: 16px;">&nbsp;</div>
                        <div class="" style="line-height: 16px;">&nbsp;</div>
                        <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">Looking forward to your order</br></p>
                        <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">Anything Instantly</br></p>
            
                        <div style="text-align: left;">
                            <table style="width: 100%;" cellpadding="0" cellspacing="0" role="presentation">
                            
                              <tr>
                                <td style="padding-bottom: 16px; padding-top: 16px;">
                                  <div style="background-color: #d4d4d9; height: 0.5px; line-height: 1px;">&nbsp;</div>
                                </td>
                              </tr>
                              <tr>
                                  <td align="center" dir="ltr" valign="top" style="padding:0 24px 0 24px">
                                  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                  <tbody><tr>
              
                                  <td align="center" valign="top" width="20" style="width:20px">
                                  &nbsp;
                                  </td>
                                  <td align="center" valign="top">
                                  <table align="center" valign="top" cellspacing="0" cellpadding="0" role="presentation">
                                  <tbody><tr>
                                  <td align="center" valign="top"><a href="https://www.instagram.com/__anythinginstantly__/" style="text-decoration:none" target="_blank"><img src="https://anythinginstantly.com/image/instagram-48.png" width="33" height="auto" style="padding:11px 8px;width:33px;height:auto;display:block" border="0" title="Follow YouTube Creators on Instagram " alt="Follow YouTube Creators on Instagram " class="CToWUd" data-bit="iit"></a></td>
                                  </tr>
                                  </tbody></table>
                                  </td>
                                  <td align="center" valign="top">
                                  <table align="center" valign="top" cellspacing="0" cellpadding="0" role="presentation">
                                  <tbody><tr>
                                  <td align="center" valign="top"><a href="https://www.facebook.com/people/Anything-Instantly/100084401683757/" style="text-decoration:none" target="_blank"><img src="https://anythinginstantly.com/image/facebook-48.png" width="33" height="auto" style="padding:11px 8px;width:33px;height:auto;display:block" border="0" title="Follow YouTube Creators on facebook " alt="Follow YouTube Creators on facebook " class="CToWUd" data-bit="iit"></a></td>
                                  </tr>
                                  </tbody></table>
                                  </td>
                                  </tr>
                                  </tbody></table>
                                  </td>
                                  </tr>
                            </table>
                            <p style="line-height: 16px; margin: 0; color: #8492a6; font-size: 12px;text-align: center;">&copy; 2024 AnythingInstantly. All rights reserved.</p>
                          </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            </body>
            </html>';
            $email=array($response['data']['email']);
            $from_arr=[
                'name' => 'Team Anything Instantly',
                'email' => 'info@shipting.com',  
            ];
            $subject='Reset password confirmation';
            $this->sendmail($email,$from_arr,$subject,$mail_template);
        }
        return response()->json($response);
    }
    
    public function sendMail($to_array,$from_arr, $subject, $message){
        $url = 'https://api.elasticemail.com/v2/email/send';
        try{
            $post = array('from' => $from_arr['email'],
                          'fromName' => $from_arr['name'],
                          'to' => $to_array[0],
    
                          'subject' => html_entity_decode($subject),
                          'bodyHtml' => html_entity_decode($message),
                          'bodyText' => '',
                          'isTransactional' => false,
                        );
            $ch = curl_init();
            curl_setopt_array($ch, array(
                CURLOPT_URL => $url,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $post,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HEADER => false,
                CURLOPT_SSL_VERIFYPEER => false
            ));
            
            $result=curl_exec ($ch);
            curl_close ($ch);
            return true;
        }
        catch(Exception $ex){
            Log::info(' Something went wrong');
            return false; 
        }
    }
    
    public function addAddress(Request $request){
        if(empty($request->user_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)["addressList"=>''],'message'=>'Customer ID is missing.'];
            return response()->json($response);
        }
        if(empty($request->name)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)["addressList"=>''],'message'=>'Customer Name is missing.'];
            return response()->json($response);
        }
        if(empty($request->phone)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)["addressList"=>''],'message'=>'Customer Phone is missing.'];
            return response()->json($response);
        }
        if(empty($request->address)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)["addressList"=>''],'message'=>'Customer Address is missing.'];
            return response()->json($response);
        }
        if(empty($request->city)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)["addressList"=>''],'message'=>'Customer City is missing.'];
            return response()->json($response);
        }
        if(empty($request->state)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)["addressList"=>''],'message'=>'Customer State is missing.'];
            return response()->json($response);
        }
        if(empty($request->country)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)["addressList"=>''],'message'=>'Customer Country is missing.'];
            return response()->json($response);
        }
        if(empty($request->zip_code)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)["addressList"=>''],'message'=>'Customer Zip Code is missing.'];
            return response()->json($response);
        }
		$adressData=array(
			'address_id'=>$request->address_id?$request->address_id:0,
			'user_id'=>$request->user_id,
			'address_name'=>$request->address_name,
			'name'=>$request->name,
			'email'=>$request->email?$request->email:'',
			'phone'=>$request->phone,
			'address'=>$request->address,
			'address2'=>$request->address2,
			'city'=>$request->city,
			'state'=>$request->state,
			'country'=>$request->country,
			'zip_code'=>$request->zip_code 		
		); 
		$cart=new Cart();
        if($adressData['address_id']>0){
            $addAddress =$cart->updateAddress($adressData);		
            if($addAddress){
                $getAddress =$cart->getAddress(['o.customer_id'=>$request->user_id]);
                return response()->json(['status'=>1,'code'=>200,'data'=>array("addressList"=>$getAddress) ,'message'=>'Address has been updated!']);
            } else {
                return response()->json(['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Something went wrong. Please try again later!']);
            }
        }else{
            $addAddress =$cart->addAddress($adressData);		
            if($addAddress){
                $getAddress =$cart->getAddress(['o.customer_id'=>$request->user_id]);
                return response()->json(['status'=>1,'code'=>200,'data'=>array("addressList"=>$getAddress) ,'message'=>'Address has been added!']);
            } else {
                return response()->json(['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Something went wrong. Please try again later!']);
            }
        }
        
	}
     
    public function getAddress(Request $request){
        if(empty($request->user_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)["addressList"=>''],'message'=>'Customer ID is missing.'];
            return response()->json($response);
        }
		 if(empty($request->user_id)){
			$shipper_id = "";
		 } else {
			$shipper_id = $request->shipper_id;
		 }
		
		$cart=new Cart();
        $where=['o.customer_id'=>$request->user_id];
        if(!empty($request->address_id)){
            $where['o.address_id']=$request->address_id;
        }
		$getAddress =$cart->getAddress($where,$shipper_id);
        if(count($getAddress)){
            return response()->json(['status'=>1,'code'=>200,'data'=>array("addressList"=>$getAddress) ,'message'=>'Address list!']);
        }else{
            return response()->json(['status'=>0,'code'=>402,'data'=>array("addressList"=>$getAddress),'message'=>'Address Not Found!']);
        }
	 }
     
     public function deleteCustomerAddress(Request $request){
        if(empty($request->customer_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)["addressList"=>''],'message'=>'Customer ID is missing.'];
            return response()->json($response);
        }
        if(empty($request->address_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)["addressList"=>''],'message'=>'Address ID is missing.'];
            return response()->json($response);
        }
		$cart=new Cart();
        $where=['customer_id'=>$request->customer_id];
        $where['address_id']=$request->address_id;
		$delete =$cart->deleteCustomerAddress($where);
        $total_addresses=$cart->getAddress(['o.customer_id'=>$request->customer_id]);
        if($delete){
            return response()->json(['status'=>1,'code'=>200,'data'=>array("total_addresses"=>count($total_addresses)) ,'message'=>'Address deleted successfully!']);
        }else{
            return response()->json(['status'=>0,'code'=>402,'data'=>array("total_addresses"=>count($total_addresses)),'message'=>'Something Went Wrong!']);
        }
	 }

     public function getCategories(Request $request){
        $cart=new Cart();
        $where=array();
        if(!empty($request->id)){
            $where['c.id'] =$request->id;
        }
        $categories=$cart->getCategories($where);
        if(count($categories)){
            return response()->json(['status'=>1,'code'=>200,'data'=>$categories ,'message'=>'Category List!']);
        }else{
            return response()->json(['status'=>0,'code'=>402,'data'=>$categories ,'message'=>'Category Not Found!']);
        }

    }
     
	 
	   public function shipper_payout(Request $request){
        if(empty($request->shipper_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)["shipperpayout"=>''],'message'=>'Shipper id is missing.'];
            return response()->json($response);
        }
		 if(empty($request->shipper_id)){
			$shipper_id = "";
		 } else {
			$shipper_id = $request->shipper_id;
		 }
		
		$cart=new Cart();
      
		$shippertotalpayout =$cart->shippertotalpayout($shipper_id);
        if(count($shippertotalpayout)){
            return response()->json(['status'=>1,'code'=>200,'data'=>array("shipperpayout"=>$shippertotalpayout) ,'message'=>'Shipper payout']);
        }else{
            return response()->json(['status'=>0,'code'=>402,'data'=>array("shipperpayout"=>$shippertotalpayout),'message'=>'Shipper payout Not Found!']);
        }
	 } 
	
	
	
	
	public function aishipper_statementTransaction(Request $request) {
		
		$page = $request->page;  //1 , 2
		$items = $request->items; //20 , 20 
		
			 
		if(@$request->web=="web")
		{
		$limit1 =	$page;
		}else{
		$limit1 = (($page * $items) - $items); //(($page * $items) - $items);		
		}
		$limit2 = $items; 
		
		$search = $request->search;
		 
		$shipper_id = $request->shipper_id;
		
		
		if(!$shipper_id ) {
			return response()->json([
							'status' => 0,
							'code' =>402,
							'message' =>'values cannot be blank',
							'data' => [
								'statementDetails' => ''	
							]
						]);
		}
	 
		$query = DB::table('wh_shipper_order AS o');
				 
				$query->select(['o.id as order_id','o.invoice_no','o.total_product','o.order_amount','o.shipper_payout']
						);
				$query->join('wh_warehouse_user as wu', 'wu.wh_account_id', '=', 'o.shipper_id');
				
				$query->where(["o.shipper_id"=>$shipper_id])->Where(function($query) use ($search)  {
								$query->where('o.invoice_no', 'LIKE', '%'.$search.'%')
									->orWhere('o.id', 'LIKE', '%'.$search.'%')	
									->orWhere('o.order_amount', 'LIKE', '%'.$search.'%')	
									->orWhere('o.shipper_payout', 'LIKE', '%'.$search.'%');	
							});
					
				
				$query->orderBy('o.id', 'DESC');	
				// $query->offset($limit1);
				// $query->limit($limit2);
				$mj_statementDetails=$query->get();

			
			 // return $mj_statementDetails;
			 
			return response()->json([
						'status' => 1,
						'code' =>200,
						'message' =>'data fetched successfully',
						'data' => [
							'statementDetails' => $mj_statementDetails	
						]
					]);  
 
	}
     
     

    public function updateToken(Request $request){
		
		if(empty($request->user_id)){
			$user_id = "";
			
			return response()->json([
							'status' => 0,
							'code' =>402,
							'message' =>'user_id can not be blank',
							'data' => [
								'updateToken' => 'Not updated'	
							]
						]);
            
        } else {
			$user_id = $request->user_id;
		}
		
		if(empty($request->androidDeviceToken)){
			$androidDeviceToken = "";
            
        } else {
			$androidDeviceToken = $request->androidDeviceToken;
		}
		
		if(empty($request->iosDeviceToken)){
			$iosDeviceToken = "";
            
        } else {
			$iosDeviceToken = $request->iosDeviceToken;
		}
	  
		 $data=array(
            'user_id'=>$request->user_id,
            
			'androidDeviceToken'=>$androidDeviceToken,
            'iosDeviceToken'=>$iosDeviceToken,
        );
		
		$cart=new cart();
        $response=$cart->updateTokenQry($data);
       
		
		return response()->json([
							'status' => 1,
							'code' =>200,
							'message' =>'Token Updated',
							'data' => [
								'updateToken' => 'Token Updated'	
							]
						]); 
		
	}

    function reorderProduct(Request $request){
        if(empty($request->customer_id)){
            return response()->json(['status'=>0,'case'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer ID is missing!']);
        }
        if(empty($request->order_id)){
            return response()->json(['status'=>0,'case'=>0,'code'=>402,'data'=>(object)[],'message'=>'Order ID is missing!']);
        }
        if(empty($request->user_zip_code)){
            return response()->json(['status'=>0,'case'=>0,'code'=>402,'data'=>(object)[],'message'=>'User Zip Code is missing!']);
        }
        $cart=new Cart();
        $user_existance=$cart->getUserDetails(array('id'=>$request->customer_id));
        if($user_existance){
            $order_existance=$cart->orderExistance(array('so.id'=>$request->order_id));
            if($order_existance){
                if($order_existance->zip_code==$request->user_zip_code){
                    $order_details=$this->getorderDetails(['op.order_id'=>$request->order_id]);
                    if($order_details){
                        $quantity_check=[];
                        foreach($order_details as $order_row){
                            $quantity_check[]=array(
                                'product_id'=>$order_row['product_id'],
                                'quantity'=>$order_row['quantity'],
                                'user_id'=>$request->customer_id,
                            );
                        }
                        $response=$cart->reorderProduct($quantity_check,$request->customer_id,$order_existance->shipper_id);
                        return response()->json($response);
                    }else{
                        return response()->json(['status'=>0,'case'=>0,'code'=>402,'data'=>(object)[],'message'=>'No Product found in this order!']);
                    }
                }else{
                    return response()->json(['status'=>0,'case'=>0,'code'=>402,'data'=>(object)[],'message'=>'You can not reorder this product on '.$request->user_zip_code.' !']);
                }
            }else{
                return response()->json(['status'=>0,'case'=>0,'code'=>402,'data'=>(object)[],'message'=>'Order not found!']);
            }
        }else{
            return response()->json(['status'=>0,'case'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer not found!']);
        }
     }

     function posCheckUserPhone(Request $request){
        if(empty($request->phone)){
            return response()->json(['status'=>0,'case'=>0,'code'=>402,'data'=>(object)[],'message'=>'User Phone is missing!']);
        }
        $cart=new Cart();
        $user_existance=$cart->getUserDetails(array('phone'=>$request->phone));
        if($user_existance){
            return response()->json(['status'=>1,'case'=>0,'code'=>402,'user_id'=>$user_existance->id,'name'=>$user_existance->name,'email'=>$user_existance->email,'phone'=>$user_existance->phone,'data'=>(object)[],'message'=>'User Found!']);
        }else{
            return response()->json(['status'=>0,'case'=>0,'code'=>402,'user_id'=>0,'data'=>(object)[],'message'=>'Customer not found!']);
        }
    }

    function addNewCustomer(Request $request){
        $cart=new Cart();
        if(empty($request->name)){
            return response()->json(['status'=>0,'case'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer Name is missing!']);
        }
        if(empty($request->email)){
            return response()->json(['status'=>0,'case'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer Email is missing!']);
        }else{
            if($cart->getUserDetails(array('email'=>$request->email))){
                return response()->json(['status'=>0,'case'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer Email is already exists!']);
            }
        }
        if(empty($request->phone)){
            return response()->json(['status'=>0,'case'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer Phone is missing!']);
        }else{
            if($cart->getUserDetails(array('email'=>$request->phone))){
                return response()->json(['status'=>0,'case'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer Phone is already exists!']);
            }
        }
        $response=$cart->addNewCustomer(['name'=>$request->name,'email'=>$request->email,'phone'=>$request->phone]);
        return response()->json($response);
    }
    
    public function getWarehouseDetails(Request $request){
        $cart=new Cart();
        $warehouse_details=$cart->getWarehouseDetails(array('ua.company'=>$request->store_name));
        if(!$warehouse_details){
            return response()->json(['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Store not found']);
        }else{
            return response()->json(['status'=>1,'code'=>200,'data'=>$warehouse_details,'message'=>'Store Details']);
        }
    }
	
	public function getWarehouseDetailsById(Request $request){
        $cart=new Cart();
        $warehouse_details=$cart->getWarehouseDetails(array('u.wh_account_id'=>$request->wh_account_id));
        if(!$warehouse_details){
            return response()->json(['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Store not found']);
        }else{
            return response()->json(['status'=>1,'code'=>200,'data'=>$warehouse_details,'message'=>'Store Details']);
        }
    }
	
    public function getStoreTypeData(Request $request){
        $cart=new Cart();
        $store_type_details=$cart->getStoreTypeData(array('st.name'=>$request->store_type_name));
        if(!$store_type_details){
            return response()->json(['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Store type found']);
        }else{
            return response()->json(['status'=>1,'code'=>200,'data'=>$store_type_details,'message'=>'Store Details']);
        }
    }
    

    public function getCreditCardTransactionDetails(Request $request){
        $cart=new Cart();
        $transaction_details=$cart->getCreditCardTransactionDetails(array('pow.webhook_type'=>$request->webhook_type,'pow.wh_user_Email'=>$request->email,'pow.order_status'=>$request->order_status));
        if(!$transaction_details){
            return response()->json(['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Transaction not found']);
        }else{
            return response()->json(['status'=>1,'code'=>200,'data'=>$transaction_details,'message'=>'Transaction Details']);
        }
    }

    public function updateCreditCardPaymentStatus(Request $request){
        $cart=new Cart();
        $transaction_details=$cart->updateCreditCardPaymentStatus(array('id'=>$request->id,'order_status'=>$request->order_status));
        if(!$transaction_details){
            return response()->json(['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Something went wrong']);
        }else{
            return response()->json(['status'=>1,'code'=>200,'data'=>$transaction_details,'message'=>'Payment status updated']);
        }
    }

    public function posAddUpdateAgent(Request $request){
        $cart=new Cart();
        $response=$cart->posAddUpdateAgent(array(
            'id'=>$request->id,
            'shipper_id'=>$request->shipper_id,
            'name'=>$request->name,
            'email'=>$request->email,
            'phone'=>$request->phone,
            'password'=>$request->password,
            'provider_id'=>$request->provider_id,
            'status'=>$request->status,
            'agent_permissions'=>$request->agent_permissions,
        ));
        return response()->json($response);
    }  

    public function posAgentLogin(Request $request){
        $cart=new Cart();
        $response=$cart->posAgentLogin(array(
            'aa.email'=>$request->email,
            'aa.password'=>sha1($request->password),
        ));
        return response()->json($response);
    }

    public function posChangeAssociateStatus(Request $request){
        $cart=new Cart();
        $response=$cart->posChangeAssociateStatus(array(
            'id'=>$request->id,
        ));
        return response()->json($response);
    }
    
    public function posGetAgentDetails(Request $request){
        $cart=new Cart();
        $response=$cart->posGetAgentDetails(array(
            'aa.shipper_id'=>$request->shipper_id,
            'aa.id'=>$request->id,
        ));
        return response()->json($response);
    }
    
    public function posAgentList(Request $request){
        $cart=new Cart();
        $response=$cart->posAgentList(array(
            'aa.shipper_id'=>$request->shipper_id,
        ));
        return response()->json($response);
    }

    public function posAgentPermissions(Request $request){
        $cart=new Cart();
        $response=$cart->posAgentPermissions(array(
            'p.status'=>$request->status,
        ));
        return response()->json($response);
    }

    public function posGetAgentAppliedPermissions(Request $request){
        $cart=new Cart();
        $response['data']=$cart->posGetAgentAppliedPermissions(array(
            'apm.agent_id'=>$request->agent_id,
        ));
        $response['status']=1;
        return response()->json($response);
    }
    public function posGetOrderCreatedByName(Request $request){
        $cart=new Cart();
        $response['data']=$cart->posGetOrderCreatedByName(array(
            'order_created_by_type'=>$request->order_created_by_type,
            'order_created_by_id'=>$request->order_created_by_id,
        ));
        $response['status']=1;
        return response()->json($response);
    }

    
    
	public function getShipperOrders_boxes(Request $request) {
  
		$wh_account_id = $request->wh_account_id;
		
		if($wh_account_id == "" ) {
			
			return response()->json([
					'status' => 0,
					'code' =>402,
					'message' =>'Account Id can not be Empty',
					'data' => [
						'getShipperOrders' => 0
					]
				]);
		}
		
		
		if(isset($request->order_id)) {
			$order_id = $request->order_id;
			
		} else {
			$order_id = "";
		}
	
		
	
		//DB::enableQueryLog(); 
		
		    $query= DB::table('wh_shipper_order AS o');
			 
			$query->select( 'o.*','op.id as pr_id','op.box_id','ps.product_type','ps.ai_category_id' );
			
			$query->join("wh_shipper_order_product as op",function($join){
								$join->on("op.order_id","=","o.id") ;
							}); 
							
			$query->join("wh_producttoshipper as ps",function($join){
								$join->on("ps.ai_product_id","=","op.ai_product_id") ;
							}); 				
		 
			
			if($order_id) { 
				$query->where([
					['o.id', '=', $order_id]
				]);
			}
			
			
			$query->groupBy(DB::raw('o.id'));
			$query->orderBy("o.id","DESC");;
		

				
			
			
			if($order_id) { 
			
				$getShipperOrders = $query->get();
			// echo	$getShipperOrders = $query->toSql();
			} else {
				$getShipperOrders = $query->get();
			}
			
		
		
			
			$getOrder = array();
			$getOrderProduct = array();
			$i=0;
			foreach($getShipperOrders as $ShipperOrders){
				
				$order_id = $ShipperOrders->id;
			
				
				
				

				//DB::enableQueryLog(); 
		if($ShipperOrders->product_type=="AI"){
				$query1= DB::table('wh_shipper_order_product AS op');
					 
					$query1->select( 'op.*' , 'ap.ai_product_id' , 'ap.upc as upc' , 'wp.id as product_id'  ,'wp.wh_account_id' , 'wp.price', 'op.quantity','wp.sku', 'wp.discount', 'wp.ai_category_id', 'wp.radius', 'c.name as ai_category_name',
					'ap.images as main_image','wp.product_type',
					DB::raw("round((wp.price) - ( (wp.discount/100) * (wp.price) ),2 ) as discounted_price")  
					 );
					
					$query1->join("wh_producttoshipper as wp",function($join){
								$join->on("wp.id","=","op.product_id") ;
							}); 
					
					$query1->join("ai_product as ap",function($join){
								$join->on("ap.ai_product_id","=","op.ai_product_id") ;
							}); 
							
					$query1->join("ai_category as c",function($join){
								$join->on("wp.ai_category_id","=","c.id") ;
							}); 
					
					$query1->where([
							['op.order_id', '=', $ShipperOrders->id]
						]);
					 
					$getShipperOrdersProdcts = $query1->get();
		}else if($ShipperOrders->product_type=="ECOM"){
			$query1= DB::table('wh_shipper_order_product AS op');
					 
					$query1->select( 'op.*' ,'shd.tracking_id','shd.label_download','shd.carrier_id', 'ap.product_id as ai_product_id' , 'ap.upc as upc' , 'wp.id as product_id'  ,'wp.wh_account_id' , 'wp.price', 'op.quantity','wp.sku', 'wp.discount', 'wp.ai_category_id', 'wp.radius', 'c.name as ai_category_name',
					'ap.image as main_image','wp.product_type',
					DB::raw("round((wp.price) - ( (wp.discount/100) * (wp.price) ),2 ) as discounted_price")  
					 );
					
					$query1->join("wh_producttoshipper as wp",function($join){
								$join->on("wp.id","=","op.product_id") ;
							}); 
					
					$query1->join("oc_product as ap",function($join){
								$join->on("ap.product_id","=","op.ai_product_id") ;
							}); 
							
					$query1->join("ai_category as c",function($join){
								$join->on("wp.ai_category_id","=","c.id") ;
							}); 
							$query1->join("wh_shipment_ship_detail as shd",function($join){
								$join->on("shd.BoxId","=","op.box_id") ;
							}); 
					
					$query1->where([
							['shd.order_id', '=', $ShipperOrders->id]
						]);
					$query1->where([
							['op.order_id', '=', $ShipperOrders->id]
						]);
					$query1->where([
							['shd.BoxId', '!=', null]
						]);
					$query1->where([
							['op.label_url', '!=', null]
						]);
					 
					$getShipperOrdersProdcts = $query1->get();
				// echo	$getShipperOrdersProdcts = $query1->toSql();
				// die;
					
		}
					 
				//dd(DB::getQueryLog()); // Show results of log
				
					// echo '<pre>';
			// print_r($getShipperOrdersProdcts);
					 
			// die;	
			
			$uniqueRows = [];
			$groupedRows = [];
			$duplicateRows = [];

			// foreach ($getShipperOrdersProdcts as $row) {
			
			// }
			$boxIds=[];
				$j=0;
				foreach($getShipperOrdersProdcts as $ShipperOrdersProdcts){				
						
					$getOrderProduct[$j]['order_product_id'] = $ShipperOrdersProdcts->id;
					$getOrderProduct[$j]['upc'] = $ShipperOrdersProdcts->upc;
					$getOrderProduct[$j]['order_id'] = $ShipperOrdersProdcts->order_id;
					$product_id = $ShipperOrdersProdcts->product_id;
					$getOrderProduct[$j]['product_id'] = $ShipperOrdersProdcts->product_id;
					$getOrderProduct[$j]['title'] = $ShipperOrdersProdcts->title;
					$getOrderProduct[$j]['image'] = $ShipperOrdersProdcts->main_image;
					$getOrderProduct[$j]['images'] = $ShipperOrdersProdcts->main_image;
					$getOrderProduct[$j]['model'] = $ShipperOrdersProdcts->model;
					$getOrderProduct[$j]['quantity'] = $ShipperOrdersProdcts->quantity;
					$getOrderProduct[$j]['price'] = $ShipperOrdersProdcts->price;
					$getOrderProduct[$j]['total_price'] = $ShipperOrdersProdcts->total_price;
					$getOrderProduct[$j]['added_date'] = $ShipperOrdersProdcts->added_date;
					$getOrderProduct[$j]['modified_date'] = $ShipperOrdersProdcts->modified_date;
					$getOrderProduct[$j]['ai_product_id'] = $ShipperOrdersProdcts->ai_product_id; 
					$getOrderProduct[$j]['sku'] = $ShipperOrdersProdcts->sku;
					$getOrderProduct[$j]['discount'] = $ShipperOrdersProdcts->discount;
					$getOrderProduct[$j]['ai_category_id'] = $ShipperOrdersProdcts->ai_category_id;
					$getOrderProduct[$j]['radius'] = $ShipperOrdersProdcts->radius;
					$getOrderProduct[$j]['ai_category_name'] = $ShipperOrdersProdcts->ai_category_name;
					$getOrderProduct[$j]['discounted_price'] = $ShipperOrdersProdcts->discounted_price;
					$getOrderProduct[$j]['product_type'] = $ShipperOrdersProdcts->product_type;
					$getOrderProduct[$j]['label_url'] = $ShipperOrdersProdcts->label_url;
				
					
					
					$j++;
					if($ShipperOrdersProdcts->box_id){
				$boxId = $ShipperOrdersProdcts->box_id;
				if (isset($groupedRows[$boxId])) {
				$groupedRows[$boxId][] = $ShipperOrdersProdcts;
				} else {
				$boxIds[] = $boxId;
				$groupedRows[$boxId] = [$ShipperOrdersProdcts];
				}
					}
			
				}
				 
				$getOrder[$i]['OrderProducts'] = $groupedRows;
				
				$i++;
			}
			// echo '<pre>';
			// print_r($uniqueRows);
			// print_r($groupedRows);
			
			// die;
			
			
			return response()->json([
				'status' => 1,
				'code' =>200,
				'message' =>'Data Fetched Successfully',
				'data' => [
					'orders' => $getOrder
				]
			]);
		
		
	}
	
	
	
	   public function shipengine_shipcost(Request $request) {
	    
	   
	   
	    $mj= $request->all();
	  
	  // echo '<pre>';
		// print_r($mj);  die;
	  
	  $name =  $mj['name'];
	  $phone=  $mj['phone'];
	  $address=  $mj['address'];
	  $address2=  $mj['address'];
	  $state=  $mj['state'];
	  $city=  $mj['city'];
	  $postalcode=  $mj['postalcode'];
	  $country=  $mj['country'];
	  $fname=  $mj['fname'];
	  $fphone=  $mj['fphone'];
	  $faddress=  $mj['faddress'];
	  $faddress2=  $mj['faddress'];
	  $fcity=  $mj['fcity'];
	  $fstate=  $mj['fstate'];
	  $fpostalcode=  $mj['fpostalcode'];
	  $fcountry=  $mj['fcountry'];
	  $weight=  $mj['weight'];
	  $weightunit=  $mj['weightunit'];
	  $length=  $mj['length'];
	  $width=  $mj['width'];
	  $height=  $mj['height'];
	  $fcompany=  '';
	   
	   
		
		if($name && $phone && $address && $city && $state && $postalcode && $country && $fname && $fphone && $faddress && $fcity && $fstate && $fpostalcode && $weight && $weightunit && $length && $width && $height  ) {
		for ($x = 0; $x <= 2 ; $x++) {
			if($x == 0 ) {
				//UPS
				// $carrier = 'se-111429'; //prod
				$carrier = 'se-239490'; // test
			} else if ($x == 1 ) {
				//USPS Stamp.com
				// $carrier = 'se-224576'; //prod
				$carrier = 'se-239489';  // test
			} else if ($x == 2 ) {
				//Fedex .. Coming Soon
				// $carrier = 'se-155960'; //prod
				$carrier = 'se-239491'; //test
			}

		  $data_string = '{
			"rate_options": {
				"carrier_ids": [
					"'.$carrier.'"
				]
			},
		  "shipment": {
			"validate_address": "no_validation",
			"ship_to": {
			  "name": "'.$name.'",
			  "phone": "'.$phone.'",
			 "address_line1": "'.$address.'",
			 "address_line2": "'.$address2.'",
			  "city_locality": "'.$city.'",
			  "state_province": "'.$state.'",
			  "postal_code": "'.$postalcode.'",
			  "country_code": "'.$country.'",
			  "address_residential_indicator": "yes"
			},
			"ship_from": {
			  "company_name": "'.$fname.'",
			  "name": "'.$fname.'",
			  "phone": "'.$fphone.'",
			  "address_line1": "'.$faddress.'",
			  "address_line2": "'.$faddress2.'", 
			  "city_locality": "'.$fcity.'",
			  "state_province": "'.$fstate.'",
			  "postal_code": "'.$fpostalcode.'",
			  "country_code": "'.$fcountry.'",
			  "address_residential_indicator": "no"
			},
			"packages": [
			  {
				"weight": {
				  "value": '.$weight.',
				  "unit": "pound"
				},
				"dimensions": {
					"unit": "inch",
					"length": '.$length.',
					"width": '.$width.',
					"height": '.$height.'
				  },
			  }
			]
		  }
		}';

		 
		 //16 , 10, 6   and 4

		//bath rug 12 10 6
		//blanket 16 12 8


			  

			 

			$curl = curl_init();

			curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, 0);
			curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, 0);

			curl_setopt_array($curl, array(
			  CURLOPT_URL => "https://api.shipengine.com/v1/rates",
			  CURLOPT_RETURNTRANSFER => true,
			  CURLOPT_ENCODING => "",
			  CURLOPT_MAXREDIRS => 10,
			  CURLOPT_TIMEOUT => 30,
			  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
			  CURLOPT_CUSTOMREQUEST => "POST",
			  CURLOPT_POSTFIELDS => "",
			  CURLOPT_HTTPHEADER => array(
 
				'Content-Type: application/json' . "\r\n"
				. 'Content-Length: ' . strlen($data_string) . "\r\n",
				'content' => $data_string,
				
			  ),
			));

			$response = curl_exec($curl);
			$err = curl_error($curl);

			curl_close($curl);
			 
			if ($err) {
			  //echo "cURL Error #:" . $err;
				//echo "there is some error";
			} else {
				 
				$responseArray[] = json_decode($response,true);
			}				
		}
		// echo "<pre>"; print_r($responseArray); 
		// die;
		
		$newArrayUPS = [];
		
		if(@$responseArray) {
		
			$keyArrayUPS = $this->myfunction($responseArray[0]['rate_response']['rates'], 'service_code', 'ups_ground');
			 if(@$keyArrayUPS){
			 foreach($keyArrayUPS as $val) {
				 $newArrayUPS[] = $responseArray[0]['rate_response']['rates'][$val];
			 }
		}
			 
			$keyArrayUSPS  = $this->myfunction($responseArray[1]['rate_response']['rates'], 'service_code', 'usps_priority_mail');
			$newArrayUSPS = []; 
			 if(@$keyArrayUSPS){ 
			foreach($keyArrayUSPS as $val1) {
				 $newArrayUSPS[] = $responseArray[1]['rate_response']['rates'][$val1];
			}
		}
			 
			$finalArrayUSPS = [];
			$finalKeyArrayUSPS  = $this->myfunction($newArrayUSPS, 'package_type', 'package');
			 if(@$finalKeyArrayUSPS){
			foreach($finalKeyArrayUSPS as $val2) {
				 $finalArrayUSPS[] = $newArrayUSPS[$val2];
			}
		}
		$newArrayFedex = [];
		 if(@$responseArray[2]){
			$keyArrayFedex = $this->myfunction(@$responseArray[2]['rate_response']['rates'], 'service_code', 'fedex_ground');
			  if(@$keyArrayFedex){
			 foreach($keyArrayFedex as $val3) {
				 $newArrayFedex[] = $responseArray[2]['rate_response']['rates'][$val3];
			 }
			  }
		}
			 
			$newArrayFedex1 = [];
			if(@$responseArray[2]){
			$keyArrayFedex1 = $this->myfunction($responseArray[2]['rate_response']['rates'], 'service_code', 'fedex_home_delivery');
			 if(@$keyArrayFedex1){
			 foreach($keyArrayFedex1 as $val4) {
				 $newArrayFedex1[] = $responseArray[2]['rate_response']['rates'][$val4];
			 }
		}
		}
			$newArrayUPS2 = [];
			$keyArrayUPS2 = $this->myfunction($responseArray[0]['rate_response']['rates'], 'service_code', 'ups_3_day_select');
			  if(@$keyArrayUPS2){
			 foreach($keyArrayUPS2 as $val) {
				 $newArrayUPS2[] = $responseArray[0]['rate_response']['rates'][$val];
			 }
		}
			  $newArrayUPS3 = [];
			 $keyArrayUPS3 = $this->myfunction($responseArray[0]['rate_response']['rates'], 'service_code', 'ups_2nd_day_air');
			  if(@$keyArrayUPS3){
			 foreach($keyArrayUPS3 as $val) {
				 $newArrayUPS3[] = $responseArray[0]['rate_response']['rates'][$val];
			 }
		}
			$newArrayUPS4 = [];
			 $keyArrayUPS4 = $this->myfunction($responseArray[0]['rate_response']['rates'], 'service_code', 'ups_next_day_air_saver');
			  if(@$keyArrayUPS4){
			 foreach($keyArrayUPS4 as $val) {
				 $newArrayUPS4[] = $responseArray[0]['rate_response']['rates'][$val];
			 }
		}
			 $newArrayUPS5 = [];
			 $keyArrayUPS5 = $this->myfunction($responseArray[0]['rate_response']['rates'], 'service_code', 'ups_next_day_air_early_am');
			  if(@$keyArrayUPS5){
			 foreach($keyArrayUPS5 as $val) {
				 $newArrayUPS5[] = $responseArray[0]['rate_response']['rates'][$val];
			 }
		}
			 $newArrayUPS6 = [];
			 $keyArrayUPS6 = $this->myfunction($responseArray[0]['rate_response']['rates'], 'service_code', 'ups_next_day_air');
			  if(@$keyArrayUPS6){
			 foreach($keyArrayUPS6 as $val) {
				 $newArrayUPS6[] = $responseArray[0]['rate_response']['rates'][$val];
			 }
		}
			 
			$newArrayUSPS2 = [];
			$keyArrayUSPS2  = $this->myfunction($responseArray[1]['rate_response']['rates'], 'service_code', 'usps_priority_mail_express');
			 if(@$keyArrayUSPS2){ 
			foreach($keyArrayUSPS2 as $val1) {
				 $newArrayUSPS2[] = $responseArray[1]['rate_response']['rates'][$val1];
			}
		}
			 
				$finalArrayUSPS2 = [];
			$finalKeyArrayUSPS2  = $this->myfunction($newArrayUSPS2, 'package_type', 'package');
			 if(@$finalKeyArrayUSPS2){
			foreach($finalKeyArrayUSPS2 as $val2) {
				 $finalArrayUSPS2[] = $newArrayUSPS2[$val2];
			}
		}
			$newArrayUSPS3 = [];
			$keyArrayUSPS3  = $this->myfunction($responseArray[1]['rate_response']['rates'], 'service_code', 'usps_media_mail');
			  if(@$keyArrayUSPS3){
			foreach($keyArrayUSPS3 as $val1) {
				 $newArrayUSPS3[] = $responseArray[1]['rate_response']['rates'][$val1];
			}
		}
			 
			$finalArrayUSPS3 = [];
			$finalKeyArrayUSPS3  = $this->myfunction($newArrayUSPS3, 'package_type', 'package');
			 if(@$finalKeyArrayUSPS3){
			foreach($finalKeyArrayUSPS3 as $val3) {
				 $finalArrayUSPS3[] = $newArrayUSPS3[$val2];
			}
		}
			$newArrayUSPS4 = [];
			$keyArrayUSPS4  = $this->myfunction($responseArray[1]['rate_response']['rates'], 'service_code', 'usps_parcel_select');
			  if(@$keyArrayUSPS4){
			foreach($keyArrayUSPS4 as $val1) {
				 $newArrayUSPS4[] = $responseArray[1]['rate_response']['rates'][$val1];
			}
		}
			 
			$finalArrayUSPS4 = [];
			$finalKeyArrayUSPS4  = $this->myfunction($newArrayUSPS4, 'package_type', 'package');
			 if(@$finalKeyArrayUSPS4){
			foreach($finalKeyArrayUSPS4 as $val3) {
				 $finalArrayUSPS4[] = $newArrayUSPS4[$val2];
			}
		}
			$newArrayFedex2 = [];
			if(@$responseArray[2]){
			$keyArrayFedex2 = $this->myfunction($responseArray[2]['rate_response']['rates'], 'service_code', 'fedex_first_overnight');
			 if(@$keyArrayFedex2){
			 foreach($keyArrayFedex2 as $val4) {
				 $newArrayFedex2[] = $responseArray[2]['rate_response']['rates'][$val4];
			 }
		}
			
			 $newArrayFedex3 = [];
			$keyArrayFedex3 = $this->myfunction($responseArray[2]['rate_response']['rates'], 'service_code', 'fedex_priority_overnight');
			 if(@$keyArrayFedex3){
			 foreach($keyArrayFedex3 as $val4) {
				 $newArrayFedex3[] = $responseArray[2]['rate_response']['rates'][$val4];
			 }
		}
			 $newArrayFedex4 = [];
			$keyArrayFedex4 = $this->myfunction($responseArray[2]['rate_response']['rates'], 'service_code', 'fedex_standard_overnight');
			 if(@$keyArrayFedex4){
			 foreach($keyArrayFedex4 as $val4) {
				 $newArrayFedex4[] = $responseArray[2]['rate_response']['rates'][$val4];
			 }
		}
			 $newArrayFedex5 = [];
			 $keyArrayFedex5 = $this->myfunction($responseArray[2]['rate_response']['rates'], 'service_code', 'fedex_2day_am');
			 if(@$keyArrayFedex5){
			 foreach($keyArrayFedex5 as $val4) {
				 $newArrayFedex5[] = $responseArray[2]['rate_response']['rates'][$val4];
			 }
		}
			  $newArrayFedex6 = [];
			 $keyArrayFedex6 = $this->myfunction($responseArray[2]['rate_response']['rates'], 'service_code', 'fedex_2day');
			 if(@$keyArrayFedex6){
			 foreach($keyArrayFedex6 as $val4) {
				 $newArrayFedex6[] = $responseArray[2]['rate_response']['rates'][$val4];
			 }
		}
			  $newArrayFedex7 = [];
			  $keyArrayFedex7 = $this->myfunction($responseArray[2]['rate_response']['rates'], 'service_code', 'fedex_express_saver');
			 if(@$keyArrayFedex7){
			 foreach($keyArrayFedex7 as $val4) {
				 $newArrayFedex7[] = $responseArray[2]['rate_response']['rates'][$val4];
			 }
		}
		}
			
			if(@!$newArrayUPS) {
				$newArrayUPS = array();
			}
			
			if(@!$finalArrayUSPS) {
				$finalArrayUSPS = array();
			}
			
			if(@!$newArrayFedex1) {
				$newArrayFedex1 = array();
			}
			
			if(@!$newArrayFedex) {
				$newArrayFedex = array();
			}
			
			if(@!$newArrayUPS2) {
				$newArrayUPS2 = array();
			}
			
			if(@!$newArrayUPS3) {
				$newArrayUPS3 = array();
			}
			
			if(@!$newArrayUPS4) {
				$newArrayUPS4 = array();
			}
			if(@!$newArrayUPS5) {
				$newArrayUPS5 = array();
			}
			
			if(@!$newArrayUPS6) {
				$newArrayUPS6 = array();
			}
			
			if(@!$finalArrayUSPS2) {
				$finalArrayUSPS2 = array();
			}
			
			if(@!$finalArrayUSPS3) {
				$finalArrayUSPS3 = array();
			}
			
			if(@!$finalArrayUSPS4) {
				$finalArrayUSPS4 = array();
			}
			
			if(@!$newArrayFedex2) {
				$newArrayFedex2 = array();
			}
			
			if(@!$newArrayFedex3) {
				$newArrayFedex3 = array();
			}
			
			if(@!$newArrayFedex4) {
				$newArrayFedex4 = array();
			}
			
			if(@!$newArrayFedex5) {
				$newArrayFedex5 = array();
			}
			
			if(@!$newArrayFedex6) {
				$newArrayFedex6 = array();
			}
			
			if(@!$newArrayFedex7) {
				$newArrayFedex7 = array();
			}
			
			$finalArray = array_merge($newArrayUPS,$finalArrayUSPS,$newArrayFedex1,$newArrayFedex,$newArrayUPS2,$newArrayUPS3,$newArrayUPS4,$newArrayUPS5,$newArrayUPS6,$finalArrayUSPS2,$finalArrayUSPS3,$finalArrayUSPS4,$newArrayFedex2,$newArrayFedex3,$newArrayFedex4,$newArrayFedex5,$newArrayFedex6,$newArrayFedex7 );
			//print_r($finalArray);
			
			
			 usort($finalArray, function($a, $b) {
				  /* print_r($a);
				  print_r($b);
				  die;  */ 
				 
				return $a['shipping_amount']['amount']+$a['other_amount']['amount'] <=> $b['shipping_amount']['amount']+$b['other_amount']['amount'];
			});
			
			if($finalArray){ 
			
				// session_start();
				// $_SESSION['formDataShip'] = $_POST;
				
				// echo json_encode($finalArray);
				
				return response()->json([
							'status' => 1,
							'code' =>200,
							'message' =>'ship cost response',
							'data' => [
								'getShipCost' => $finalArray
							]
						]);
			} else {
				echo "there is some error ";
			}
		} else {
			echo "there is some error ";
		}
		}else{
			return response()->json([
							'status' => 0,
							'code' =>402,
							'message' =>'Required values can not be empty',
							'data' => [
								'getShipCost' => 0
							]
						]);
			
		}
		
		
	}
	
	  public function myfunction($products, $field, $value)

	{

	   foreach($products as $key => $product)

	   {

		  if ( $product[$field] === $value ){

			 $keyArray[] = $key;
		  }

	   }

	   if(@$keyArray){

		   return $keyArray;
	   }

	   return false;

	}
	
	
public function create_shipengine_label_new(Request $request)
	{
		
		if($request->select_service_type && $request->postalcode && $request->fpostalcode && $request->name  && $request->phone && $request->address && $request->city && $request->state && $request->country && $request->fname  && $request->fphone && $request->faddress && $request->fcity && $request->fstate && $request->fcountry && $request->weight && $request->weightunit && $request->length  && $request->width && $request->height) {
			
			
		 $order_id=$request->order_id;
		 $startingBoxId=$request->startingBoxId;
		 $carrier_type=$request->select_service_type;
		 $order_pr_id=$request->order_pr_id;
		$order_pr_id_explded= explode(',',$order_pr_id);
		 
	     $delivery_zipcodeee = $request->postalcode;  
		 $delivery_zipcodee_to = sprintf("%05d", $delivery_zipcodeee);
		
		$delivery_zipcode =$request->fpostalcode ;
		$delivery_zipcodee_from = sprintf("%05d", $delivery_zipcode);
		
	$shipdate= date('Y-m-d');
	$data_string = '{
  "shipment": {
    "service_code": "'.$carrier_type.'",
    "ship_date": "'.$shipdate.'",
    "ship_to": {
      "name": "'.$request->name.'",
      "phone": "'.$request->phone.'",
      "company_name": "'.$request->name.'",
      "address_line1": "'.$request->address.'",
      "city_locality": "'.$request->city.'",
      "state_province": "'.$request->state.'",
      "postal_code": "'.$delivery_zipcodee_to.'",
      "country_code": "'.$request->country.'",
      "address_residential_indicator": "no"
    },
    "ship_from": {
      "name": "'.$request->fname.'",
      "phone": "'.$request->fphone.'",
      "company_name": "'.$request->fname.'",
      "address_line1": "'.$request->faddress.'",
      "address_line2": "'.$request->faddress.'",
      "city_locality": "'.$request->fcity.'",
      "state_province": "'.$request->fstate.'",
      "postal_code": "'.$delivery_zipcodee_from.'",
      "country_code": "'.$request->fcountry.'",
      "address_residential_indicator": "no"
    },   
	"packages": [
		  {
			"weight": {
			  "value": "'.$request->weight.'",
			  "unit": "'.$request->weightunit.'"
			},
			"dimensions": {
				"unit": "inch",
				"length": "'.$request->length.'",
				"width": "'.$request->width.'",
				"height": "'.$request->height.'"
			  }
		  }    
		]
  }
}';	
  
		$shipengine_response=$this->curl_int($data_string);
		// echo '<pre>';
		// print_r($shipengine_response);
		 // die;
		$carrier_name=$shipengine_response['service_code'];
			$shipcost=$shipengine_response['shipment_cost']['amount'];
			$tracking_id=$shipengine_response['tracking_number'];
			$ship_date=$shipengine_response['ship_date'];
			$delivery_date='';
			
			$shipping_service_type=$shipengine_response['service_code'];
			
			$label_id=$shipengine_response['label_id'];
			$shipment_id=$shipengine_response['shipment_id'];
			$carrier_id=$shipengine_response['carrier_id'];
			$label_download=$shipengine_response['label_download']['pdf'];
			$label_download_png=$shipengine_response['label_download']['png'];
			$wh_shipper_order='';
			if($label_download_png){
			foreach($order_pr_id_explded as $order_pr_id_explded_val)
			{
				$affected2 = DB::table('wh_shipper_order_product')
								->where('id', $order_pr_id_explded_val)
							
								->update(
									[
										'label_url' => $label_download_png 
									]);	
			}
					$wh_shipper_order = DB::table('wh_shipper_order as so')
					->leftJoin('wh_shipper_order_product as sop', 'sop.order_id', '=', 'so.id')
					->where(['so.id'=>$order_id])
					->whereNull('sop.label_url')
					->get();
			}
		
		            DB::table('wh_shipment_ship_detail')->insert([
					'order_id'=> $request->order_id,
					'product_id'=> '' ,								
					'BoxId'=> $request->startingBoxId,								
					'carrier_name'=> $carrier_name ,								
					'shipcost'=> $shipcost ,							
					'tracking_id'=> $tracking_id ,								
					'ship_date'=> $ship_date ,								
					'delivery_date'=> $delivery_date ,								
					'ship_quantity'=> '', 								
					'shipping_service_type'=> $shipping_service_type ,								
					'label_id'=> $label_id ,								
					'shipment_id'=> $shipment_id ,								
					'carrier_id'=> $carrier_id, 								
					'label_download'=> $label_download ,								
					'label_png'=> $label_download_png ,								
					'order_type'=> 'ESHIP' 								
												
													
						]);
						
						
		if(@$shipengine_response['status']=="completed"){
		return response()->json([
							'status' => 1,
							'code' =>200,
							'message' =>'LABEL GENERATED SUCCESSFULLY',
							'data' => [
								'Label_info' => $shipengine_response,
								'wh_shipper_order_info' => $wh_shipper_order,
							]
						]);
		}else if(@$shipengine_response['errors']){
			return response()->json([
							'status' => 0,
							'code' =>402,
							'message' =>'ERROR IN LABEL GENERATION',
							'data' => [
								'Label_info' => $shipengine_response['errors'],
								'wh_shipper_order_info' => $wh_shipper_order,
							]
						]);
		}
		
		} else {
			return response()->json([
							'status' => 0,
							'code' =>402,
							'message' =>'REQUIRED VALUES CANNOT BE EMPTY',
							'data' => [
								'Label_info' => 0
							]
						]);
		}
		
	}
	
	
	function curl_int($data_string=null)
	{
		/*   echo '<pre>';
		print_r($data_string);   
		die; */
		$curl = curl_init();

			curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, 0);
			curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, 0);

			curl_setopt_array($curl, array(
			  CURLOPT_URL => "https://api.shipengine.com/v1/labels",
			  CURLOPT_RETURNTRANSFER => true,
			  CURLOPT_ENCODING => "",
			  CURLOPT_MAXREDIRS => 10,
			  CURLOPT_TIMEOUT => 30,
			  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
			  CURLOPT_CUSTOMREQUEST => "POST",
			  CURLOPT_POSTFIELDS => "",
			  CURLOPT_HTTPHEADER => array(
		 
				'Content-Type: application/json' . "\r\n"
				. 'Content-Length: ' . strlen($data_string) . "\r\n",
				'content' => $data_string,
				
			  ),
			));

			 $response11  = curl_exec($curl);
			//   echo "<pre>"; print_r($response11);  die;   
			$err = curl_error($curl);

			curl_close($curl);

			if ($err) {
			  echo "cURL Error #:" . $err;
			 // $txt = "Error: Curl error for product id ".$product_id." ".date('Y-m-d H:i:s')." ";
			  //$myfile = file_put_contents($log_file_path, $txt.PHP_EOL , FILE_APPEND);
			  
			} else {
				
			      $responsew = json_decode($response11,true);
			     // echo "<pre>"; print_r($responsew);  die;
				return $responsew;
				  
				
				
			
				//$txt = "Success: Product updated for product id ".$product_id." ".date('Y-m-d H:i:s')." ";
				//$myfile = file_put_contents($log_file_path, $txt.PHP_EOL , FILE_APPEND);
			}
	}

 
    public function updateOrder(Request $request){
        
        if(empty($request->customer_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Customer ID is missing!'];
            return response()->json($response);
        }

        if(empty($request->order_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Order ID is missing!'];
            return response()->json($response);
        }
 

        if(empty($request->payment_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Payment ID is missing!'];
            return response()->json($response);
        }

        $order_data=array(
			'customer_id'=>$request->customer_id,
			'order_id'=>$request->order_id,
			'payment_status'=>$request->payment_status,
			'payment_id'=>$request->payment_id,
		);

        $cart=new Cart(); 
        $response=$cart->updateOrder($order_data);
        if($response['status']){
                $user_profile=$cart->viewCustomerProfile(['u.id'=>$request->customer_id]);
                if($response['payment_status']){
                    $mail_message='<!DOCTYPE html>
                    <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
                    <head>
                      <meta charset="utf8">
                      <meta http-equiv="x-ua-compatible" content="ie=edge">
                      <meta name="viewport" content="width=device-width, initial-scale=1">
                      <meta name="x-apple-disable-message-reformatting">
                      <title>Happy news: order confirmed!</title>
                    
                    </head>
                    <body lang="en" style="margin: 0; padding: 0; width: 100%; word-break: break-word; -webkit-font-smoothing: antialiased; background-color: #ffffff;">
                    <table class="wrapper" style="width: 100%;font-family: -apple-system, Segoe UI, sans-serif !important;" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td align="left" style bgcolor="#ffffff">
                          <table class="sm-w-full" style="width: 640px;" cellpadding="0" cellspacing="0" role="presentation">
                            <tr>
                              <td class="sm-px-16 sm-py-24" style="padding-left: 40px; padding-right: 40px; padding-top: 48px; padding-bottom: 48px; text-align: left;" bgcolor="#ffffff" align="left">
                                <div style="text-align:center">
                                  <a href="https://anythinginstantly.com" style="color: #0047c3; text-decoration: none;">
                                    <img src="https://anythinginstantly.com/photo/logo.png" alt="anythinginstantly" width="250" style="line-height: 100%; vertical-align: middle; border: 0;">
                                  </a>
                                </div>                    
                                <div style="background-color: #d4d4d9; height: 0.5px; line-height: 1px;margin:22px 0px;">&nbsp;</div>
                    
                    
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;"><b>Hey '.$user_profile->name.',</b> 👋</p>
                                            <div class="" style="line-height: 16px;">&nbsp;</div>			
                                
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">Thank you for ordering from Anything instantly!</p> 
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">We are starting to process your order, you will be able to track it shortly.. 🤩</p>
                                <div class="" style="line-height: 16px;">&nbsp;</div>
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">We value your opinion to improve continuously. If you have any suggestions/queries, write us at <a href="mailto:support@anythinginstantly.com"><b>support@anythinginstantly.com</b></a></p>
                                <div class="" style="line-height: 16px;">&nbsp;</div>
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">You can track your order <a href="https://anythinginstantly.com/order-successful/'.base64_encode($response['order_id']).'">here</a>.</p>
                                
                                <div class="" style="line-height: 16px;">&nbsp;</div>
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">Thank you for your time.</br>
                                </p>
                                <p style="line-height: 22px;   margin: 0;   color: #8492a6;   font-size: 16px;">
                                Anything Instantly</p>
                            
                                
                                <div class="" style="line-height: 16px;">&nbsp;</div>
                                            <div style="text-align: left;">
                                  <table style="width: 100%;" cellpadding="0" cellspacing="0" role="presentation">
                                  
                                    <tr>
                                      <td style="padding-bottom: 16px; padding-top: 16px;">
                                        <div style="background-color: #d4d4d9; height: 0.5px; line-height: 1px;">&nbsp;</div>
                                      </td>
                                    </tr>
                                    <tr>
                                        <td align="center" dir="ltr" valign="top" style="padding:0 24px 0 24px">
                                        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                        <tbody><tr>
                    
                                        <td align="center" valign="top" width="20" style="width:20px">
                                        &nbsp;
                                        </td>
                                        <td align="center" valign="top">
                                        <table align="center" valign="top" cellspacing="0" cellpadding="0" role="presentation">
                                        <tbody><tr>
                                        <td align="center" valign="top"><a href="https://www.instagram.com/__anythinginstantly__/" style="text-decoration:none" target="_blank"><img src="https://anythinginstantly.com/image/instagram-48.png" width="33" height="auto" style="padding:11px 8px;width:33px;height:auto;display:block" border="0" title="Follow YouTube Creators on Instagram " alt="Follow YouTube Creators on Instagram " class="CToWUd" data-bit="iit"></a></td>
                                        </tr>
                                        </tbody></table>
                                        </td>
                                        <td align="center" valign="top">
                                        <table align="center" valign="top" cellspacing="0" cellpadding="0" role="presentation">
                                        <tbody><tr>
                                        <td align="center" valign="top"><a href="https://www.facebook.com/people/Anything-Instantly/100084401683757/" style="text-decoration:none" target="_blank"><img src="https://anythinginstantly.com/image/facebook-48.png" width="33" height="auto" style="padding:11px 8px;width:33px;height:auto;display:block" border="0" title="Follow YouTube Creators on facebook " alt="Follow YouTube Creators on facebook " class="CToWUd" data-bit="iit"></a></td>
                                        </tr>
                                        </tbody></table>
                                        </td>
                                        </tr>
                                        </tbody></table>
                                        </td>
                                        </tr>
                                  </table>
                                  <p style="line-height: 16px; margin: 0; color: #8492a6; font-size: 12px;text-align: center;">&copy; 2024 AnythingInstantly. All rights reserved.</p>
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    </body>
                    </html>';
                    $email=array($user_profile->email);
                    $from_arr=[
                        'name' => 'Team Anything Instantly',
                        'email' => 'info@shipting.com',  
                    ];
                    $subject="Order Confirmed ";
                    $this->sendmail($email,$from_arr,$subject,$mail_message);
                }
            return response()->json([
                'data' => $response,
                'status' => 1,
                'code' => 200,
                'message' => $response['message'],
            ]);
        }else{
            return response()->json([
                'data' => (object)[],
                'status' => 0,
                'code' => 402,
                'message' => "Something Went Wrong!",
            ]);
        }
     }


     public function getShipperOrdersDetails(Request $request){
        $cart=new cart();
        if(empty($request->order_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Order ID is missing!'];
            return response()->json($response);  
        }
        if(empty($request->shipper_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Shipper ID is missing!'];
            return response()->json($response);  
        }
        $where=[];
        if($request->shipper_id>0){
            $where['o.shipper_id']=$request->shipper_id;
        }
        if($request->order_id>0){
            $where['o.id']=$request->order_id;
        }
        $order=$cart->getShipperOrdersDetails($where);
		
        if(!$order){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Order does not exists!'];
            return response()->json($response);  
        }
        $actual_time=explode(' ',$order->time);
		$minutes_to_be_delivered_on=$actual_time[0]+5;//$driver_order_status_data['minutes_to_be_delivered_on'];
		
		if(empty($order->company_icon)){
			$store_img=asset('stores/store_default.png');
		}else{
			$store_img=asset('apiDocs/'.$order->company_icon);
		}
		 
		$driver_id = $order->driver_id; 
		if($driver_id){
			
			$driver= new Driver();
			$driver_order_status_data=$driver->getDriverOrderStatus([
					'order_id'=>$order->order_id,
					'driver_id'=>$driver_id
				],
			);
			
			 
			$driver_order_message=$driver_order_status_data['message'];
			$driver_order_status=$driver_order_status_data['driver_order_status'];
			if($driver_order_status == 1){
				$driver_order_status_text = 'Accepted';
			}
			$visible=$driver_order_status_data['visible'];
		} else {
			$driver_order_status_data['data'] = array();
			$driver_order_message  = '';
			$driver_order_status  = '';
			$driver_order_status_text  = '';
		}
	  
		if($order->delivery_type == "driver"){
			if($driver_id){
				
				$driver_order_message=$driver_order_status_data['message'];
				$driver_order_status=$driver_order_status_data['driver_order_status'];
				
				
				if($driver_order_status == 1){
					$driver_order_status_text = 'Accepted';
					$is_pick_up_button = 'N';
				} else if($driver_order_status == 2){
					$driver_order_status_text = 'On The Way to Pickup';
					$is_pick_up_button = 'N';
				} else if($driver_order_status == 3){
					$driver_order_status_text = 'Picked up';
					$is_pick_up_button = 'Y';
				} else if($driver_order_status == 8){
					$driver_order_status_text = 'Picked up';
					$is_pick_up_button = 'N';
				} else if($driver_order_status == 4){
					$driver_order_status_text = 'Reached at Store';
					$is_pick_up_button = 'N';
				} else if($driver_order_status == 5){
					$driver_order_status_text = 'On the way to deliver the order';
					$is_pick_up_button = 'N';
				} else if($driver_order_status == 6){
					$driver_order_status_text = 'Reached at location';
					$is_pick_up_button = 'N';
				} else if($driver_order_status == 7){
					$driver_order_status_text = 'Delivered';
					$is_pick_up_button = 'N';
					$order->delivered = 'Y'; 
				} else {
					$is_pick_up_button = 'N';
				}
				
				$order_status = $driver_order_status_text; 
				
			} else {
				$order_status = "Finding a delivery partner";
				$is_pick_up_button = 'N';
			}
		} else {
			$is_pick_up_button = 'N';
			
			if($order->cancelled == 'Y'){
				 
				$order_status = 'Cancelled';
			} else if($order->accepted == 'N'){
			 
				$order_status = 'Pending';
				
				if($order->delivery_type == "driver"){
					if($driver_id){
						$order_status = $driver_order_status_text; 
					}
				}
				
			} else if($order->accepted == 'Y' && $order->packed == 'N') {
				 
				$order_status = 'Accepted';
			} else if($order->accepted == 'Y' && $order->packed == 'Y' && $order->Shipped == 'N' ) {
				 
				$order_status = 'Packed';
			} else if($order->accepted == 'Y' && $order->packed == 'Y' && $order->Shipped == 'Y' && $order->delivered == 'N' ) {
				 
				$order_status = 'Shipped';
			} else if($order->accepted == 'Y' && $order->packed == 'Y' && $order->Shipped == 'Y' && $order->delivered == 'Y' ) {
				 
				$order_status = 'Delivered';
			} else {
				 
				$order_status = 'Unknown';
			}
		
		}
		
		
		if(empty($order->to_be_delivered_on)){
			
			$data=[
				'store_address' => $order->shipper_address,
  				'store_city' => $order->shipper_city,
  				'store_state' => $order->shipper_state,
  				'store_country' => $order->shipper_country,
  				'store_zip_code' => $order->shipper_zipcode,
  				'address' => $order->address,
  				'city' => $order->city,
  				'state' => $order->state,
  				'country' => $order->country,
  				'zip_code' => $order->zip_code,
			];
			
			 
            // 'lat'=>$order->drop_lat,
            // 'long'=>$order->drop_long,
			
			$dis_time=new ScanSellc();
			$b=$dis_time->exactDistance($data);
			$distance11 = $b['distance'];
			$distance = (int) filter_var($distance11, FILTER_SANITIZE_NUMBER_INT);
			$time = $b['time'];
			$totalDistance = round($distance,2);
			 
			$actual_time=explode(' ',$time);
			$today_date_time= date('Y-m-d H:i:s'); 
			$actual_to_be_delivered_on= strtotime($today_date_time.' + '.($actual_time[0]+5).' minute');
			$to_be_delivered_on = date('Y-m-d H:i:s', $actual_to_be_delivered_on);
		} else {
			$to_be_delivered_on = $order->to_be_delivered_on;
		} 
		
		 
		
        $response=[
            'order_id'=>$order->order_id,
            'customer_id'=>$order->customer_id,
            'shipper_id'=>$order->shipper_id,
            'name'=>$order->name,
            'invoice_no'=>$order->invoice_no,
            'phone'=>$order->phone,
            'country'=>$order->country,
            'city'=>$order->city,
            'state'=>$order->state,
            'email'=>$order->email,
            'total_amount'=>$order->total_amount,
            'order_amount'=>$order->total_amount,
            'address'=>$order->address,
            'address_name'=>$order->address_name,
            'order_reference'=>$order->order_reference,
            'zip_code'=>$order->zip_code,
            'id'=>$order->id,
            'order_date'=>$order->order_date,
            'payment_method'=>$order->payment_method,
            'payment_status'=>$order->payment_status,
            'total_product'=>$order->total_product,
            'payment_id'=>$order->payment_id,
            'delivered'=>$order->delivered,
            'delivered_image'=>$order->delivered_image,
            'delivered_sign'=>$order->delivered_sign,
            'visible_drunk'=>$order->visible_drunk,
            'package_received_by'=>$order->package_received_by,
            'driver_note'=>$order->driver_note,
			 
            'delivered_time'=>$order->delivered_time,
            'Shipped'=>$order->Shipped,
            'Shipped_time'=>$order->Shipped_time,
            'packed'=>$order->packed,
            'packed_time'=>$order->packed_time,
            'accepted'=>$order->accepted,
            'accepted_time'=>$order->accepted_time,
            'cancelled'=>$order->cancelled,
            'cancelled_time'=>$order->cancelled_time,
            'driver_delivered'=>$order->driver_delivered,
            'refunded'=>$order->refunded,
            'refunded_time'=>$order->refunded_time,
            'store_rating'=>$order->store_rating,
            'delivery_rating'=>$order->delivery_rating,
            'customer_message'=>$order->customer_message,
            'shipper_company_name'=>$order->shipper_company_name,
            'shipper_name'=>$order->shipper_name,
            'shipper_phone'=>$order->shipper_phone,
            'shipper_email'=>$order->shipper_email,
            'shipper_address'=>$order->shipper_address,
            'shipper_city'=>$order->shipper_city,
            'shipper_state'=>$order->shipper_state,
            'shipper_country'=>$order->shipper_country,
            'shipper_zipcode'=>$order->shipper_zipcode,
            'discounted_amount_after_coupon'=>$order->discounted_amount_after_coupon,
            'coupon_id'=>$order->coupon_id,
            'calculated_orderMetaData'=>$order->calculated_orderMetaData,
            'driver_accepted'=>$order->driver_accepted,
            'accepted_datetime'=>$order->accepted_datetime,
            'order_created_by_type'=>$order->order_created_by_type,
            'delivery_type'=>$order->delivery_type,
            'driver_id'=>$order->driver_id,
			'driver_order_message'=>$driver_order_message,
			'driver_order_status'=>$driver_order_status,
			'driver_order_status_data'=>$driver_order_status_data['data'],
            'order_status'=>$order_status,
            'is_pick_up_button' =>$is_pick_up_button,
            'to_be_delivered_on'=>$to_be_delivered_on,
            'go_to_pickup'=>$order->go_to_pickup,
            'go_to_pickup_date_time'=>$order->go_to_pickup_date_time,
            'confirm_pickup'=>$order->confirm_pickup,
            'confirm_pickup_datetime'=>$order->confirm_pickup_datetime,
            'reached_at_store'=>$order->reached_at_store,
            'reached_at_store_date_time'=>$order->reached_at_store_date_time,
            'on_the_way_to_the_customer'=>$order->on_the_way_to_the_customer,
            'on_the_way_to_the_customer_date_time'=>$order->on_the_way_to_the_customer_date_time,
            'reached_at_customer'=>$order->reached_at_customer,
            'reached_at_customer_date_time'=>$order->reached_at_customer_date_time,
            'driver_delivered'=>$order->driver_delivered,
            'delivered_datetime'=>$order->delivered_datetime,
            'driver_note'=>$order->driver_note,
            'visible_drunk'=>$order->visible_drunk,
            'package_received_by'=>$order->package_received_by,
            'delivery_proof_file_name'=>$order->delivery_proof_file_name,
            'delivery_proof_file_path'=>$order->delivery_proof_file_path,
            'customer_signature_file_name'=>$order->customer_signature_file_name,
            'customer_signature_file_path'=>$order->customer_signature_file_path,
            'confirm_pickup_by_driver'=>$order->confirm_pickup_by_driver,
            'confirm_pickup_driver_datetime'=>$order->confirm_pickup_driver_datetime,
            'firstname'=>$order->firstname,
            'lastname'=>$order->lastname,
            'profile_img'=>$order->profile_img,
            'store_name'=>$order->store_name,
            'company_icon'=>$order->company_icon,
            'store_img'=>$store_img,
            'distance'=>$order->distance,
            'duration'=>$minutes_to_be_delivered_on,
            'minutes_to_be_delivered_on'=>$minutes_to_be_delivered_on,
			'driver_details'=> [
				  'driver_id'=>$order->driver_id,
				  'driver_firstname'=>$order->driver_firstname,
				  'driver_lastname'=>$order->driver_lastname,
				  'driver_email'=>$order->driver_email,
				  'driver_phone'=>$order->driver_phone,
				  'driver_status'=>$order->driver_status,
				  'driver_address'=>$order->driver_address,
				  'driver_addresszip'=>$order->driver_addresszip,
				  'driver_company'=>$order->driver_company,
				  'driver_profileimg'=>$order->driver_profileimg,
		  
			],
            'pickup'=>[
                'name'=>$order->shipper_company_name,
                'address'=>$order->shipper_address,
                'city'=>$order->shipper_city,
                'state'=>$order->shipper_state,
                'country'=>$order->shipper_country,
                'zip_code'=>$order->shipper_zipcode,
                'lat'=>$order->pickup_lat,
                'long'=>$order->pickup_long,
            ],
            'drop_off'=>[
                'name'=>$order->name,
                'address'=>$order->address,
                'city'=>$order->city,
                'state'=>$order->state,
                'country'=>$order->country,
                'zip_code'=>$order->zip_code,
                'lat'=>$order->drop_lat,
                'long'=>$order->drop_long,
            ],
			'order_products'=>$this->getorderDetails(['op.order_id'=>$order->order_id])
        ];
		
		 
        return response()->json([
            'data' => $response,
            'status' => 1,
            'code' => 200,
            'message' => "Order Details",
        ]);
     }

    

    public function changeDeliveryType(Request $request){
        $cart=new cart();
		 
		if(empty($request->order_id)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Order ID is missing!'];
            return response()->json($response);  
        }
		
        if(empty($request->delivery_type)){
            $response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Delivery type is missing!'];
            return response()->json($response);  
        } else {
			$data['delivery_type'] = $request->delivery_type;
		}
        
        $where=[];
        
        if($request->order_id>0){
            $where['id']=$request->order_id;
        }
        $changeDeliveryType=$cart->changeDeliveryType($where,$data);
        
		return response()->json([
				//'data' => $response,
				'status' => 1,
				'code' => 200,
				'message' => "Delivery type changed", 
			]);
		 
	}


	public function changeSelfOrderStatus(Request $request){
		
		$order_id=$request->order_id;
		//$driver_id=$request->driver_id;
		$status=$request->status;
		$visible_drunk=$request->visible_drunk;
		$package_received_by=$request->package_received_by?$request->package_received_by:'';
		if(empty($request->order_id)){
			$response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Order ID is missing!'];
			return response()->json($response);
		}
		 
		if(!isset($request->status)){
			$response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'Status missing!'];
			return response()->json($response);
		}
		$driver= new Driver();
		$driver_note=$request->driver_note?$request->driver_note:'';
		$delivery_proof_file_name='';
		$delivery_proof_file_path='';
		$customer_signature_file_name='';
		$customer_signature_file_path='';
		if($status==7){
 			if(empty($package_received_by)){
				$response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'please enter received by person name!'];
				return response()->json($response);
			}
			$delivery_proof = $request->file('delivery_proof');
        	if(!empty($delivery_proof)){
            //$filename = time().$delivery_proof->getClientOriginalName();

			$original_name = strtolower(trim($delivery_proof->getClientOriginalName()));
			$filename = time().rand(100,999).$original_name;



            $extension = $delivery_proof->getClientOriginalExtension();
            $fileSize = $delivery_proof->getSize();
            $maxFileSize = 2097152; 

            if($fileSize <= $maxFileSize){
                $location = 'driver/delivery_proof';
                $delivery_proof->move($location,$filename);
				$delivery_proof_file_name=$filename; 
				if(empty($filename)){
					$response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'something went wrong in delevery proof!'];
					return response()->json($response);
				}
            }
        }else{
			$response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'please select delevery proof!'];
			return response()->json($response);
		}
		$customer_signature = $request->file('customer_signature');
        	if(!empty($customer_signature)){
          //  $filename = time().$customer_signature->getClientOriginalName();
			$original_name = strtolower(trim($customer_signature->getClientOriginalName()));
			$filename = time().rand(100,999).$original_name;
            $extension = $customer_signature->getClientOriginalExtension();
            $fileSize = $customer_signature->getSize();
            $maxFileSize = 2097152; 

            if($fileSize <= $maxFileSize){
                $location = 'driver/customer_signature';
                $customer_signature->move($location,$filename);
				$customer_signature_file_name=$filename;
				if(empty($filename)){
					$response= ['status'=>0,'code'=>402,'data'=>(object)[],'message'=>'something went wrong in customer_signature!'];
					return response()->json($response);
				}
            }
        }
		}
		$response=$driver->changeDriverOrderStatus(
			[
				'order_id'=>$order_id,
				//'driver_id'=>$driver_id,
				'driver_note'=>$driver_note,
				'delivery_proof_file_name'=>$delivery_proof_file_name,
				'package_received_by'=>$package_received_by,
				'visible_drunk'=>$visible_drunk?$visible_drunk:0,
				'delivery_proof_file_path'=>URL::asset('driver/delivery_proof/'.$delivery_proof_file_name),
				'customer_signature_file_name'=>$customer_signature_file_name,
				'customer_signature_file_path'=>URL::asset('driver/customer_signature/'.$customer_signature_file_name),
				'shipper_id'=>$request->shipper_id?$request->shipper_id:0,
				'status'=>$status
			]
		); 
		$orders=$driver->getDriverOrders(
			[
				//'driver_id'=>$request->driver_id,
				'order_id'=>$request->order_id,
				'status'=>0,
			]
		);
		$response['data']= array('order_list'=>$this->formatOrders($orders,$request->driver_id));
		return response()->json($response);




	}

	
	public function botPaymentStatus(Request $request){
		
		//$order_id=$request->order_id;
		 
		$response= array('payment_status'=>"paid");
		 
		return response()->json([
				'data' => $response,
				'status' => 1,
				'code' => 200,
				'message' => "Payment Done", 
			]);
	}
	
	public function getUserByPhone(Request $request) {
		$cart = new cart();
		$phone = $request->phone;
		
		if (!$phone) {
			return response()->json([
				'status' => 0,
				'message' => 'Phone number is required'
			]);
		}
		
		// Clean phone number (remove spaces, dashes, etc.)
		$phone = preg_replace('/[^0-9+]/', '', $phone);
		
		// Find user by phone
		$user = DB::table('ai_users')
					->where('phone', $phone)
					->orWhere('phone', ltrim($phone, '+'))
					->orWhere('phone', '+' . ltrim($phone, '+'))
					->first();
		
		if ($user) {
			// Get ALL addresses for the user
			$addresses = $cart->getAddress(['o.customer_id' => $user->id]);
			
			// Format addresses for response
			$formattedAddresses = [];
			if (!empty($addresses)) {
				foreach ($addresses as $addr) {
					$formattedAddresses[] = [
						'address_id' => $addr['address_id'],
						'address_name' => $addr['address_name'] ?? 'Home',
						'full_address' => $addr['address'] . ', ' . $addr['city'] . ', ' . $addr['state'] . ' ' . $addr['zip'],
						'address' => $addr['address'],
						'address2' => $addr['address2'] ?? '',
						'city' => $addr['city'],
						'state' => $addr['state'],
						'zip' => $addr['zip'],
						'country' => $addr['country_name'],
						'phone' => $addr['phone']
					];
				}
			}
			
			return response()->json([
				'status' => 1,
				'message' => 'User found',
				'data' => [
					'user_id' => $user->id,
					'name' => $user->name,
					'email' => $user->email,
					'phone' => $user->phone,
					'address_count' => count($formattedAddresses),
					'addresses' => $formattedAddresses,
					'default_address' => !empty($formattedAddresses) ? $formattedAddresses[0] : null
				]
			]);
		}
		
		// User not found
		return response()->json([
			'status' => 0,
			'message' => 'User not found',
			'data' => null
		]);
	}
	
	public function guestRegister(Request $request)
	{
		$phone = $request->input('phone');
		$name = $request->input('name', 'WhatsApp Customer');
		$country_code = $request->input('country_code', '+1');
		
		if (!$phone) {
			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Phone number is required'
			]);
		}
		
		// Clean phone number
		$phone = preg_replace('/[^0-9]/', '', $phone);
		
		// Check if user already exists
		$cart = new cart();
		$existingUser = DB::table('ai_users')
						->where('phone', $phone)
						->first();
		
		if ($existingUser) {
			return response()->json([
				'status' => 1,
				'code' => 200,
				'message' => 'User already exists',
				'data' => [
					'user_id' => $existingUser->id,
					'name' => $existingUser->name,
					'is_new' => false
				]
			]);
		}
		
		// Generate credentials
		$tempPassword = 'WA' . rand(100000, 999999);
		$placeholderEmail = 'wa_' . $phone . '@whatsapp.guest';
		
		// Use existing registration method
		$add_update_data = array(
			'name' => $name,
			'email' => $placeholderEmail,
			'country_code' => $country_code,
			'phone' => $phone,
			'referred_code' => '',
			'password' => sha1($tempPassword),
			'otp' => ''  // Skip OTP for WhatsApp guests
		);
		
		$response = $cart->customerRegistration($add_update_data);
		
		if ($response['status']) {
			return response()->json([
				'status' => 1,
				'code' => 200,
				'message' => 'Guest user created',
				'data' => [
					'user_id' => $response['user_id'],
					'name' => $name,
					'phone' => $phone,
					'temp_password' => $tempPassword,
					'is_new' => true
				]
			]);
		}
		
		return response()->json([
			'status' => 0,
			'code' => 402,
			'message' => $response['message'] ?? 'Registration failed'
		]);
	}
	
	public function whatsappConfigByPhone(Request $request){ 
		$phone_number = $request->phone_number;
		
		// Normalize: remove spaces, dashes, parentheses - keep only digits and +
		$normalized_phone = preg_replace('/[^0-9+]/', '', $phone_number);
		
		$query = DB::table('seller_whatsapp_config AS wc');
			 
		$query->select('wc.*', 'wu.wh_account_id', 'wu.email', 'wua.company as company_name');
		$query->join('wh_warehouse_user as wu', 'wu.wh_account_id', '=', 'wc.wh_account_id');
		$query->join('wh_warehouse_user_address as wua', 'wua.warehouse_user_id', '=', 'wu.id');
		
		// Compare normalized versions of both numbers
		$query->whereRaw("REGEXP_REPLACE(wc.display_phone_number, '[^0-9+]', '') = ?", [$normalized_phone]);
			 
		$whatsappConfigByPhone = $query->get()->first();
			 
		if(isset($whatsappConfigByPhone->wh_account_id)) {
			return [
				'status' => 1,
				'code' => 200,
				'data' => $whatsappConfigByPhone,
				'message' => "Whatsapp Business Connection information by phone"
			];
		} else {
			return [
				'status' => 0,
				'code' => 402,
				'message' => 'No WhatsApp config found for this phone number'
			];
		}
	}
	
	public function whatsappConfigByStoreid(Request $request){ 
		$wh_account_id = $request->wh_account_id;
		
		$query = DB::table('seller_whatsapp_config AS wc');
			 
		$query->select('wc.*', 'wu.wh_account_id', 'wu.email', 'wua.company as company_name');
		$query->join('wh_warehouse_user as wu', 'wu.wh_account_id', '=', 'wc.wh_account_id');
		$query->join('wh_warehouse_user_address as wua', 'wua.warehouse_user_id', '=', 'wu.id');
	
		$query->where('wc.wh_account_id', $wh_account_id);
			 
		$whatsappConfigByStoreid = $query->first();  // ✅ Use first() directly, no need for get()->first()
			 
		if(isset($whatsappConfigByStoreid->wh_account_id)) {
			return [
				'status' => 1,
				'code' => 200,
				'data' => $whatsappConfigByStoreid,
				'message' => "Whatsapp Business Connection information by store ID"
			];
		} else {
			return [
				'status' => 0,
				'code' => 402,
				'message' => 'No WhatsApp config found for this store ID'
			];
		}
	}


	public function whatsappConfigByPhoneNumberId(Request $request){ 
		$phone_number_id = $request->phone_number_id;
		
		if (!$phone_number_id) {
			return [
				'status' => 0,
				'code' => 400,
				'message' => 'phone_number_id is required'
			];
		}
		
		$query = DB::table('seller_whatsapp_config AS wc');
			 
		$query->select('wc.*', 'wu.wh_account_id', 'wu.email', 'wua.company as company_name');
		$query->join('wh_warehouse_user as wu', 'wu.wh_account_id', '=', 'wc.wh_account_id');
		$query->join('wh_warehouse_user_address as wua', 'wua.warehouse_user_id', '=', 'wu.id');
		
		$query->where('wc.phone_number_id', $phone_number_id);
			 
		$whatsappConfig = $query->first();
			 
		if(isset($whatsappConfig->wh_account_id)) {
			return [
				'status' => 1,
				'code' => 200,
				'data' => $whatsappConfig,
				'message' => "Whatsapp Business Connection information by phone_number_id"
			];
		} else {
			return [
				'status' => 0,
				'code' => 402,
				'message' => 'No WhatsApp config found for this phone_number_id'
			];
		}
	}


}

